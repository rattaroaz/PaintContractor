import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { PageTitle } from "../components/PageTitle";
import { useGlobalState } from "../context/GlobalStateContext";
import { useNotification } from "../context/NotificationContext";
import type { JobDescription } from "../types";
import { confirmDelete } from "../utils/confirm";
import {
  findJobByKey,
  isDuplicateDescription,
  oneRowPerDescription,
} from "../utils/jobs";

interface JobRow extends JobDescription {
  /** Description string last persisted for this row (used when renaming). */
  savedDescription: string;
  isNew?: boolean;
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

const SAVE_DEBOUNCE_MS = 400;

function toJobRow(job: JobDescription, isNew = false): JobRow {
  const desc = job.description.trim();
  return {
    ...job,
    description: desc,
    savedDescription: desc,
    isNew,
    saveStatus: "idle",
  };
}

export function JobCatalogPage() {
  const { setCurrentSection } = useGlobalState();
  const { success, error } = useNotification();
  const [catalog, setCatalog] = useState<JobDescription[]>([]);
  const catalogRef = useRef<JobDescription[]>([]);
  const [rows, setRows] = useState<JobRow[]>([]);
  const rowsRef = useRef<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  catalogRef.current = catalog;
  rowsRef.current = rows;

  useEffect(() => {
    setCurrentSection("Reference Data");
    load();
  }, [setCurrentSection]);

  const load = async () => {
    setLoading(true);
    try {
      const jobs = await api.getAllJobs();
      catalogRef.current = jobs;
      setCatalog(jobs);
      const unique = oneRowPerDescription(jobs);
      setRows(
        unique.length > 0
          ? unique.map((j) => toJobRow(j, false))
          : [toJobRow({ id: 0, description: "", size_bedroom: 0, size_bathroom: 0, price: 0 }, true)]
      );
    } catch (e) {
      error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const refreshCatalog = async () => {
    const jobs = await api.getAllJobs();
    catalogRef.current = jobs;
    setCatalog(jobs);
    return jobs;
  };

  const mergeIntoCatalog = (saved: JobDescription) => {
    setCatalog((prev) => {
      const idx = prev.findIndex(
        (j) =>
          j.description.trim() === saved.description.trim() &&
          j.size_bedroom === saved.size_bedroom &&
          j.size_bathroom === saved.size_bathroom
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        catalogRef.current = next;
        return next;
      }
      const next = [...prev, saved];
      catalogRef.current = next;
      return next;
    });
  };

  const persistRow = useCallback(
    async (rowIndex: number, row: JobRow) => {
      const desc = row.description.trim();
      if (!desc) {
        setRows((prev) =>
          prev.map((r, i) =>
            i === rowIndex ? { ...r, saveStatus: "idle" as const } : r
          )
        );
        return;
      }

      if (isDuplicateDescription(desc, rowsRef.current, rowIndex)) {
        error("This job description already exists. Each description can only appear once.");
        setRows((prev) =>
          prev.map((r, i) =>
            i === rowIndex ? { ...r, saveStatus: "error" as const } : r
          )
        );
        return;
      }

      setRows((prev) =>
        prev.map((r, i) =>
          i === rowIndex ? { ...r, saveStatus: "saving" as const } : r
        )
      );

      try {
        const oldDesc = row.savedDescription.trim();
        if (
          oldDesc &&
          oldDesc.toLowerCase() !== desc.toLowerCase()
        ) {
          await api.deleteJobsByDescription(oldDesc);
          await refreshCatalog();
        }

        const result = await api.upsertJob({
          id: 0,
          description: desc,
          size_bedroom: row.size_bedroom,
          size_bathroom: row.size_bathroom,
          price: row.price,
        });

        if (result.success && result.data) {
          await refreshCatalog();
          mergeIntoCatalog(result.data);
          setRows((prev) =>
            prev.map((r, i) =>
              i === rowIndex
                ? {
                    ...result.data!,
                    savedDescription: result.data!.description.trim(),
                    isNew: false,
                    saveStatus: "saved" as const,
                  }
                : r
            )
          );
        } else {
          setRows((prev) =>
            prev.map((r, i) =>
              i === rowIndex ? { ...r, saveStatus: "error" as const } : r
            )
          );
          error(result.message || "Failed to save job.");
        }
      } catch (e) {
        setRows((prev) =>
          prev.map((r, i) =>
            i === rowIndex ? { ...r, saveStatus: "error" as const } : r
          )
        );
        error(String(e));
      }
    },
    [error]
  );

  const scheduleSave = useCallback(
    (rowIndex: number, row: JobRow) => {
      if (saveTimers.current[rowIndex]) {
        clearTimeout(saveTimers.current[rowIndex]);
      }
      saveTimers.current[rowIndex] = setTimeout(() => {
        void persistRow(rowIndex, row);
        delete saveTimers.current[rowIndex];
      }, SAVE_DEBOUNCE_MS);
    },
    [persistRow]
  );

  const resolvePriceForCombo = (
    description: string,
    sizeBedroom: number,
    sizeBathroom: number,
    jobs: JobDescription[]
  ): Pick<JobRow, "id" | "price"> => {
    const match = findJobByKey(jobs, description, sizeBedroom, sizeBathroom);
    if (match) {
      return { id: match.id, price: match.price };
    }
    return { id: 0, price: 0 };
  };

  const applyRowPatch = (idx: number, patch: Partial<JobRow>) => {
    setRows((prev) => {
      const current = prev[idx];
      if (!current) return prev;

      if ("description" in patch) {
        const nextDesc = String(patch.description).trim();
        if (
          nextDesc &&
          isDuplicateDescription(nextDesc, prev, idx)
        ) {
          error("This job description already exists. Each description can only appear once.");
          return prev;
        }
      }

      let next: JobRow = { ...current, ...patch };

      if (
        "description" in patch ||
        "size_bedroom" in patch ||
        "size_bathroom" in patch
      ) {
        const desc = next.description.trim();
        if (desc) {
          const resolved = resolvePriceForCombo(
            desc,
            next.size_bedroom,
            next.size_bathroom,
            catalogRef.current
          );
          next = { ...next, id: resolved.id, price: resolved.price };
        }
      }

      scheduleSave(idx, next);
      return prev.map((r, i) => (i === idx ? next : r));
    });
  };

  const addRow = () => {
    const hasBlank = rowsRef.current.some((r) => !r.description.trim());
    if (hasBlank) {
      error("Enter a job description on the empty row before adding another.");
      return;
    }
    setRows((prev) => [
      ...prev,
      toJobRow(
        { id: 0, description: "", size_bedroom: 0, size_bathroom: 0, price: 0 },
        true
      ),
    ]);
  };

  const removeRow = async (idx: number) => {
    if (!(await confirmDelete())) return;
    const row = rowsRef.current[idx];
    if (!row) return;

    const desc = row.savedDescription.trim() || row.description.trim();
    if (desc) {
      try {
        const result = await api.deleteJobsByDescription(desc);
        if (!result.success) {
          error(result.message);
          return;
        }
        await refreshCatalog();
        success(result.message || "Job removed.");
      } catch (e) {
        error(String(e));
        return;
      }
    }
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveStatusLabel = (status?: JobRow["saveStatus"]) => {
    switch (status) {
      case "saving":
        return (
          <span className="text-muted small" aria-live="polite">
            Saving…
          </span>
        );
      case "saved":
        return (
          <span className="text-success small" aria-live="polite">
            Saved
          </span>
        );
      case "error":
        return (
          <span className="text-danger small" aria-live="polite">
            Save failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container-fluid">
      <PageTitle title="New Jobs" icon="➕" />
      <div className="card-section">
        <p className="text-muted small mb-3">
          Each job description appears once. Change bedrooms or bathrooms to load
          the saved price for that combination; change the price to save it for
          the current combination. Duplicate descriptions are not allowed.
        </p>
        {loading ? (
          <div className="alert alert-info">Loading job catalog…</div>
        ) : (
          <>
            <div className="row fw-bold mb-2 d-none d-md-flex">
              <div className="col-md-5">Job Description</div>
              <div className="col-md-1">Bedrooms</div>
              <div className="col-md-1">Bathrooms</div>
              <div className="col-md-2">Price</div>
              <div className="col-md-3">Actions</div>
            </div>
            {rows.map((row, idx) => (
              <div
                key={`${row.savedDescription || "new"}-${idx}`}
                className={`row g-2 mb-2 align-items-center p-2 rounded ${
                  row.isNew ? "row-new-job" : "row-existing-job"
                }`}
              >
                <div className="col-md-5">
                  <input
                    className="form-control"
                    value={row.description}
                    onChange={(e) =>
                      applyRowPatch(idx, { description: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-1">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className="form-control"
                    value={row.size_bedroom}
                    onChange={(e) =>
                      applyRowPatch(idx, {
                        size_bedroom: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-md-1">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className="form-control"
                    value={row.size_bathroom}
                    onChange={(e) =>
                      applyRowPatch(idx, {
                        size_bathroom: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={row.price}
                    onChange={(e) =>
                      applyRowPatch(idx, {
                        price: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-md-3 d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => void removeRow(idx)}
                  >
                    Delete
                  </button>
                  {saveStatusLabel(row.saveStatus)}
                </div>
              </div>
            ))}
            <div className="d-flex gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={addRow}
              >
                Add
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => void load()}
              >
                Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
