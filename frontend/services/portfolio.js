import { cache } from "react";
import { readPublicContent } from "./content-source.mjs";

export const getPortfolio = cache(() => readPublicContent());
