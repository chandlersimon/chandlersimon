import Link from 'next/link';
import Image from 'next/image';

export default function AboutSection() {
  return (
    <section className="about-grid" id="about">
        <div className="about-grid__column about-grid__bio">
            <p className="about-grid__eyebrow">About</p>
            <p>Since graduating from the University of Washington, I’ve focused on designing experiences that bridge hardware, software, and the spaces in between. With roots in motion and product, my work threads tactile imagery with crisp systems thinking. I love turning ideas into things people can actually hold, play with, or connect to. When I’m not designing, I’m usually running, playing soccer, or hanging out with my dog (Ollie) in Seattle.</p>
            <div className="about-grid__actions">
                <a className="text-link text-link--arrow" href="mailto:design@chandlersimon.com">
                    <span className="text-link__label">Email</span>
                    <span className="text-link__arrow">↗</span>
                </a>
                <a className="text-link text-link--arrow" href="/assets/other/ChandlerSimon_Resume.pdf" target="_blank" rel="noopener noreferrer">
                    <span className="text-link__label">Resume</span>
                    <span className="text-link__arrow">↗</span>
                </a>
                <a className="text-link text-link--arrow" href="https://www.linkedin.com/in/chandlersimon/" target="_blank" rel="noopener noreferrer">
                    <span className="text-link__label">LinkedIn</span>
                    <span className="text-link__arrow">↗</span>
                </a>
            </div>
        </div>

        <div className="about-grid__column">
            <p className="about-grid__label">Education</p>
            <ul className="about-grid__list">
                <li><strong>University of Washington</strong> <span>2018 – 2022</span> <span>B.DES in Interaction Design</span></li>
                <li><strong>Highline College</strong> <span>2016 – 2018</span> <span>AAS in Visual Communication Design</span></li>
            </ul>
        </div>

        <div className="about-grid__column">
            <p className="about-grid__label">Experience</p>
            <ul className="about-grid__list">
                <li>
                    <strong>
                        <a href="https://www.breville.com/" target="_blank" rel="noopener noreferrer" className="text-link text-link--arrow">
                            <span className="text-link__label">Breville</span>
                            <span className="text-link__arrow">↗</span>
                        </a>
                    </strong> 
                    <span>Senior UX Designer</span> 
                    <span>Jan '23 – Current</span>
                </li>
                <li>
                    <strong>
                        <a href="https://www.madebyon.com/" target="_blank" rel="noopener noreferrer" className="text-link text-link--arrow">
                            <span className="text-link__label">Madebyon</span>
                            <span className="text-link__arrow">↗</span>
                        </a>
                    </strong> 
                    <span>UX Designer</span> 
                    <span>Jun '22 – May '23</span>
                </li>
                <li>
                    <strong>
                        <a href="https://studiotilt.design/" target="_blank" rel="noopener noreferrer" className="text-link text-link--arrow">
                            <span className="text-link__label">Studio Tilt</span>
                            <span className="text-link__arrow">↗</span>
                        </a>
                    </strong> 
                    <span>Design Researcher</span> 
                    <span>Sep '20 – Jun '22</span>
                </li>
            </ul>
        </div>

        <div className="about-grid__portrait">
            <Image 
                src="/assets/other/profile.JPG" 
                alt="Portrait of Chandler Simon" 
                width={320} 
                height={320}
                className="w-full h-auto block"
            />
        </div>
    </section>
  );
}
