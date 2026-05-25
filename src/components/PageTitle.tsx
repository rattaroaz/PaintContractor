interface PageTitleProps {
  title: string;
  icon?: string;
}

export function PageTitle({ title, icon }: PageTitleProps) {
  return (
    <h3 className="text-center mb-4 page-title">
      {icon && <span className="me-2 material-icon" aria-hidden>{icon}</span>}
      {title}
    </h3>
  );
}
