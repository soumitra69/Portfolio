import ProfilePhoto from "../components/ProfilePhoto";
import Experience from "../components/Experience";
import Projects from "../components/Projects";
import Skills from "../components/Skills";
import initialProjects from "../../shared/projects.json";
import initialSkills from "../../shared/skills.json";
import Header from "../components/Header";
import ContactForm from "../components/ContactForm";
import SectionAnimations from "../components/SectionAnimations";

export default function Home() {
  return (
    <>
      <Header />
      <main>
    
    <section id="home" className="hero">
        <div className="hero-content">
            <div className="hero-text fade-in-up">
                <h1>Hi, I'm Soumitra Samanta</h1>
                <p>A passionate Front-end Developer creating amazing digital experiences with modern technologies and
                    clean code.</p>
                <div className="cta-buttons">
                    <a href="#projects" className="btn btn-primary">
                        <i aria-hidden="true" className="fas fa-code"></i>
                        View My Work
                    </a>
                    <a href="#contact" className="btn btn-secondary">
                        <i aria-hidden="true" className="fas fa-envelope"></i>
                        Get In Touch
                    </a>
                </div>
            </div>
            <div className="hero-image">
                <ProfilePhoto />
            </div>
        </div>
    </section>

    
    <section id="about" className="about">
        <div className="container">
            <h2 className="section-title">About Me</h2>
            <div className="about-content">
                <div className="about-text">
                    <p>I'm a passionate full-stack developer with over 5 years of experience creating digital solutions
                        that make a difference. I specialize in modern web technologies and love turning complex
                        problems into simple, beautiful designs.</p>
                    <p>When I'm not coding, you can find me exploring new technologies, contributing to open-source
                        projects, or sharing knowledge with the developer community.</p>
                    <Skills initialSkills={initialSkills} />
                </div>
            </div>
        </div>
    </section>

    
    <section id="experience" className="experience">
        <div className="container">
            <h2 className="section-title">Experience</h2>
            <Experience />
        </div>
    </section>

    <section id="projects" className="projects">
        <div className="container">
            <h2 className="section-title">My Projects</h2>
            <Projects initialProjects={initialProjects} />
        </div>
    </section>

    
    <section id="contact" className="contact">
        <div className="container">
            <h2 className="section-title">Get In Touch</h2>
            <div className="contact-content">
                <div className="contact-info">
                    <h3>Let's work together!</h3>
                    <p>I'm always interested in new opportunities and interesting projects. Whether you have a question
                        or just want to say hi, feel free to reach out!</p>

                    <div className="contact-item">
                        <i aria-hidden="true" className="fas fa-envelope"></i>
                        <span>soumitrasamanta69@gmail.com</span>
                    </div>
                    <div className="contact-item">
                        <i aria-hidden="true" className="fas fa-phone"></i>
                        <span> 94750163</span>
                    </div>
                    <div className="contact-item">
                        <i aria-hidden="true" className="fas fa-map-marker-alt"></i>
                        <span>Haldia</span>
                    </div>
                </div>

                <ContactForm />
            </div>
        </div>
    </section>


      </main>
    
    <footer>
        <div className="footer-content">
            <div className="social-links">
                <a aria-label="LinkedIn" href="https://www.linkedin.com/in/soumitrasamanta69/" target="_blank" rel="noopener noreferrer"><i
                        className="fab fa-linkedin"></i></a>
                <a aria-label="GitHub" href="https://github.com/soumitra69" target="_blank" rel="noopener noreferrer"><i aria-hidden="true" className="fab fa-github"></i></a>
            </div>
            <p>&copy; <a href="https://soumitrasamanta.netlify.app/" target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--text-primary)" }}>My Original
                    Portfolio</a></p>
        </div>
    </footer>




      <SectionAnimations />
    </>
  );
}
