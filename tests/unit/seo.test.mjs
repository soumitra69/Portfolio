import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import offline from "../../frontend/shared/offline-content.json" with { type: "json" };
import { preparePublicContent, buildHomeMetadata, buildStructuredData, serializeStructuredData, SITE_URL, SEO_TITLE, SEO_DESCRIPTION } from "../../frontend/shared/seo-content.mjs";
import { imageProps } from "../../frontend/shared/image-assets.mjs";
import robots from "../../frontend/app/robots.js";
import sitemap from "../../frontend/app/sitemap.js";

test("legacy copy is improved without mutating or replacing custom CMS content", () => {
  const content = structuredClone(offline);
  content.settings.seoTitle = "Soumitra Samanta | Portfolio";
  content.about.shortIntroduction = "I'm a passionate full-stack developer with over 5 years of experience creating digital solutions that make a difference. I specialize in modern web technologies and love turning complex problems into simple, beautiful designs.";
  const upgraded = preparePublicContent(content);
  assert.equal(upgraded.settings.seoTitle, SEO_TITLE);
  assert.doesNotMatch(upgraded.about.shortIntroduction, /5 years/);
  assert.equal(content.settings.seoTitle, "Soumitra Samanta | Portfolio");
  content.about.shortIntroduction = "A new introduction from my CMS.";
  content.profile.title = "Custom developer role";
  content.settings.seoTitle = "My custom CMS title";
  const custom = preparePublicContent(content);
  assert.equal(custom.about.shortIntroduction, content.about.shortIntroduction);
  assert.equal(custom.profile.title, content.profile.title);
  assert.equal(custom.settings.seoTitle, content.settings.seoTitle);
});

test("metadata has one authoritative canonical and consistent social previews", async () => {
  const metadata = buildHomeMetadata({ ...offline, settings: { ...offline.settings, canonicalUrl: "javascript:invalid" } });
  assert.equal(metadata.alternates.canonical, SITE_URL);
  assert.equal(metadata.openGraph.url, SITE_URL);
  assert.equal(metadata.openGraph.siteName, "Soumitra Samanta");
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert.equal(metadata.robots.index, true);
  assert.ok(SEO_TITLE.length <= 60);
  assert.ok(SEO_DESCRIPTION.length >= 150 && SEO_DESCRIPTION.length <= 160);
  for (const location of ["Purba Medinipur", "Haldia", "Tamluk", "Digha"]) assert.ok(SEO_DESCRIPTION.includes(location));
  const image = metadata.openGraph.images[0];
  assert.equal(image.width,1200); assert.equal(image.height,630);
  await access(new URL(`../../frontend/public${new URL(image.url).pathname}`,import.meta.url));
});

test("structured data excludes hidden profiles and unverified business/review claims", () => {
  const content = structuredClone(offline);
  content.socialLinks = [
    { url: "https://github.com/soumitra69", isVisible: true },
    { url: "https://hidden.example", isVisible: false },
    { url: "javascript:alert(1)", isVisible: true },
    { url: "https://github.com/soumitra69", isVisible: true },
  ];
  content.profile.photoVisible=false;
  const data=buildStructuredData(content);
  assert.deepEqual(data["@graph"].map(item=>item["@type"]),["Person","WebSite","WebPage"]);
  assert.deepEqual(data["@graph"][0].sameAs,["https://github.com/soumitra69"]);
  assert.equal(data["@graph"][0].image,undefined);
  const serialized=serializeStructuredData(data);
  assert.deepEqual(JSON.parse(serialized),data);
  assert.doesNotMatch(serialized,/aggregateRating|reviewRating|streetAddress|LocalBusiness/);
  content.profile.name='</script><script>alert("injection")</script>';
  const safe=serializeStructuredData(buildStructuredData(content));
  assert.ok(!safe.includes("<"));
  assert.equal(JSON.parse(safe)["@graph"][0].name,content.profile.name);
});

test("sitemap contains only actual indexable pages and robots permits public assets", () => {
  assert.deepEqual(sitemap(),[{url:SITE_URL}]);
  const rules=robots();
  assert.equal(rules.sitemap,`${SITE_URL}sitemap.xml`);
  assert.equal(rules.rules.allow,"/");
  for (const prefix of ["/_next/","/assets/","/api/media/"]) assert.ok(!rules.rules.disallow.some(path=>prefix.startsWith(path)));
});

test("legacy image paths resolve to existing optimized files without breaking uploads", async () => {
  for (const project of offline.projects) {
    const image=imageProps(project.image,1200,675);
    assert.match(image.src,/\.webp$/);
    assert.ok(image.width>0 && image.height>0);
    await access(new URL(`../../frontend/public${image.src}`,import.meta.url));
  }
  const uploaded=imageProps("/api/media/owner-upload.webp",700,400);
  assert.equal(uploaded.src,"/api/media/owner-upload.webp");
  assert.equal(uploaded.unoptimized,true);
  assert.equal(imageProps("https://images.example/photo.jpg",700,400).unoptimized,true);
  const source=await readFile(new URL("../../frontend/components/PublicPortfolio.js",import.meta.url),"utf8");
  assert.ok(source.includes('loading="lazy"'));
});
