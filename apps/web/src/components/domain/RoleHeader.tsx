type RoleHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function RoleHeader({ eyebrow, title, subtitle, actions }: RoleHeaderProps) {
  return (
    <header className="role-header">
      <div className="role-header__text">
        {eyebrow && <p className="role-header__eyebrow">{eyebrow}</p>}
        <h1 className="role-header__title">{title}</h1>
        {subtitle && <p className="role-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="role-header__actions">{actions}</div>}
    </header>
  );
}
