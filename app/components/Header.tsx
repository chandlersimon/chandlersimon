import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="menu-bar">
      <Link href="/#top" className="menu-bar__logo" aria-label="Chandler Simon home">
        Chandler Simon
      </Link>
      <p className="menu-bar__tagline">Hi! I'm Chandler – a UX designer and prototyper building things for actual people. Currently tinkering with software & hardware products at Breville</p>
      <nav className="menu-bar__links">
        <span>
          <Link href="/#projects" className="text-link">
            <span className="text-link__label">Work</span>
          </Link>,
        </span>
        <Link href="/#about" className="text-link">
          <span className="text-link__label">About</span>
        </Link>
      </nav>
    </header>
  );
}
