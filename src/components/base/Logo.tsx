interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  light?: boolean;
}

export default function Logo({ variant = 'full', className = '', light = false }: LogoProps) {
  const logoUrl = 'https://storage.readdy-site.link/project_files/17c5ae66-8ead-4b9b-b729-9671dc0931b2/9d76b3f9-8c63-4681-8e9c-ed60a61d644a_logo-BwA7p_y_.png';

  if (variant === 'icon') {
    return (
      <img
        src={logoUrl}
        alt="DouseFire"
        className={`h-9 w-auto object-contain ${className}`}
        style={light ? { filter: 'brightness(0) invert(1)' } : undefined}
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logoUrl}
        alt="DouseFire"
        className="h-11 w-auto object-contain flex-shrink-0"
        style={light ? { filter: 'brightness(0) invert(1)' } : undefined}
      />
    </div>
  );
}