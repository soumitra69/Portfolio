const { test, expect } = require("@playwright/test");
const canonical="https://soumitrasamanta69.netlify.app/";
const heading="Web Developer in Purba Medinipur, Haldia & Tamluk";

test("homepage is server-rendered with crawlable content, metadata and safe JSON-LD", async ({page,request})=>{
  const response=await request.get("/",{headers:{"User-Agent":"Googlebot"}});
  expect(response.status()).toBe(200);
  const html=await response.text();
  expect(html).toContain(heading.replaceAll("&","&amp;"));
  expect(html).toContain("Web Development Services Across Purba Medinipur");
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(heading);
  await expect(page).toHaveTitle("Soumitra Samanta | Web Developer, Haldia & Purba Medinipur");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  // Next.js serializes a root canonical as the origin; URL normalization restores '/'.
  expect(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).href).toBe(canonical);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  const description=await page.locator('meta[name="description"]').getAttribute("content");
  expect(description.length).toBeGreaterThanOrEqual(150); expect(description.length).toBeLessThanOrEqual(160);
  for (const property of ["title","description","image","url","type","site_name"]) await expect(page.locator(`meta[property="og:${property}"]`)).toHaveCount(1);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content","summary_large_image");
  const graph=JSON.parse(await page.locator('#portfolio-structured-data').textContent());
  expect(graph["@graph"].map(item=>item["@type"])).toEqual(["Person","WebSite","WebPage"]);
  expect(graph["@graph"][0].name).toBe("Soumitra Samanta");
  await expect(page.locator(".service-guide article")).toHaveCount(10);
  expect(await page.locator(".about-text").textContent()).not.toContain("5 years");
  for(const image of await page.locator('main img').all()){
    expect((await image.getAttribute("alt")).length).toBeGreaterThan(0);
    expect(Number(await image.getAttribute("width"))).toBeGreaterThan(0);
    expect(Number(await image.getAttribute("height"))).toBeGreaterThan(0);
  }
  for(const link of await page.locator(".project-links a").all()) expect((await link.textContent()).trim().length).toBeGreaterThan(15);
  for(const link of await page.locator('a[href^="#"]').all()){
    const target=(await link.getAttribute("href")).slice(1);
    if(target) expect(await page.locator(`[id="${target}"]`).count(),`Missing #${target}`).toBe(1);
  }
});

test("crawl files, icons, social preview, admin exclusion and real 404s respond correctly",async({request})=>{
  const robots=await request.get("/robots.txt"); expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${canonical}sitemap.xml`);
  expect(await robots.text()).toContain("Allow: /");
  const sitemap=await request.get("/sitemap.xml"); expect(sitemap.status()).toBe(200);
  const xml=await sitemap.text(); expect(xml).toContain(`<loc>${canonical}</loc>`);
  expect((xml.match(/<loc>/g)||[]).length).toBe(1);
  expect(xml).not.toMatch(/admin|\?page|#services/);
  const image=await request.get("/assets/seo/soumitra-samanta-web-developer.png");
  expect(image.status()).toBe(200); expect(image.headers()["content-type"]).toContain("image/png");
  expect((await request.get("/favicon.svg")).status()).toBe(200);
  expect((await request.get("/apple-touch-icon.png")).status()).toBe(200);
  const admin=await request.get("/admin");
  expect(admin.headers()["x-robots-tag"]).toContain("noindex");
  expect(await admin.text()).toMatch(/name="robots" content="noindex, nofollow"/);
  const missing=await request.get("/this-page-does-not-exist"); expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("Return to the portfolio");
});
