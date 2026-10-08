import { Router } from "express";
import { randomUUID } from "node:crypto";
import employmentTypes from "../../frontend/shared/employment-types.json" with { type: "json" };

function validateExperience(input) {
  const { company, role, employmentType, startDate, endDate, current, description = "" } = input || {};
  const validMonth = (value) => typeof value === "string" && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value);
  if (typeof company !== "string" || !company.trim() || company.trim().length > 120
    || typeof role !== "string" || !role.trim() || role.trim().length > 120
    || !employmentTypes.includes(employmentType) || !validMonth(startDate) || typeof current !== "boolean"
    || (!current && (!validMonth(endDate) || endDate < startDate))
    || typeof description !== "string" || description.length > 2000) return null;
  return { company: company.trim(), role: role.trim(), employmentType, startDate, endDate: current ? "" : endDate, current, description: description.trim() };
}

export function createExperienceRouter(store) {
  const router = Router();
  const invalid = (response) => response.status(400).json({ message: "Enter a company, job title, employment type, and valid dates. The end date must be after or equal to the joining date, or select Present." });
  router.post("/experience", async (request, response) => {
    const experience = validateExperience(request.body);
    if (!experience) return invalid(response);
    const created = { id: randomUUID(), ...experience };
    await store.update((data) => data.experience.push(created));
    response.status(201).json(created);
  });
  router.put("/experience/:id", async (request, response) => {
    const experience = validateExperience(request.body);
    if (!experience) return invalid(response);
    const saved = await store.update((data) => {
      const index = data.experience.findIndex((item) => item.id === request.params.id);
      if (index < 0) return null;
      data.experience[index] = { id: request.params.id, ...experience };
      return data.experience[index];
    });
    response.status(saved ? 200 : 404).json(saved || { message: "Experience not found." });
  });
  router.delete("/experience/:id", async (request, response) => {
    const deleted = await store.update((data) => {
      const index = data.experience.findIndex((item) => item.id === request.params.id);
      if (index < 0) return false;
      data.experience.splice(index, 1);
      return true;
    });
    response.status(deleted ? 200 : 404).json({ message: deleted ? "Experience deleted." : "Experience not found." });
  });
  return router;
}
