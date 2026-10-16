import { SERVICE_AREAS, SERVICE_GUIDE } from "../shared/seo-content.mjs";

// Editorial service guide complements, rather than replaces, CMS service cards.
// The parent CMS Services section controls whether this content is published.
export default function ServiceOverview() {
  return (
    <>
      <p className="services-introduction">Building modern, responsive and user-friendly websites for businesses, individuals and projects across Purba Medinipur, Haldia, Tamluk, Digha and West Bengal. Explore my <a href="#projects">website projects</a>, review my <a href="#skills">development skills</a>, or <a href="#contact">discuss your website</a>.</p>
      <div className="services-grid service-guide">
        {SERVICE_GUIDE.map(service => (
          <article className="service-card glass-panel" key={service.title}>
            <i className={service.icon} aria-hidden="true" />
            <h3>{service.title}</h3>
            <p>{service.description}</p>
          </article>
        ))}
      </div>
      <div className="service-areas glass-panel" id="service-areas" aria-labelledby="service-areas-heading">
        <span className="content-kicker">LOCAL UNDERSTANDING. RESPONSIVE DEVELOPMENT.</span>
        <h3 id="service-areas-heading">Web Development Services Across Purba Medinipur</h3>
        <p>I provide freelance web development and website design services for clients in Haldia, Tamluk and Digha, as well as Contai, Nandakumar, Mecheda and Panskura. I also work with clients in Kolkata and across West Bengal. Purba Medinipur is also known as East Midnapore.</p>
        <ul className="service-area-list" aria-label="Areas served">
          {SERVICE_AREAS.map(area => <li key={area}>{area}</li>)}
        </ul>
        <a className="btn btn-secondary" href="#contact">Discuss a website for your business</a>
      </div>
      <div className="service-approach" aria-labelledby="service-approach-heading">
        <h3 id="service-approach-heading">Why Choose Soumitra Samanta for Web Development?</h3>
        <p>My approach brings together mobile-friendly layouts, a clear modern UI and maintainable code. For React development and API integration, I focus on useful interactions and understandable loading and error states. Performance, accessibility and clear communication about scope and next steps guide the work.</p>
        <a href="#about">Learn about my development approach</a>
      </div>
    </>
  );
}
