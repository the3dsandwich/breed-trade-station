export type { Gene, GeneArray, PuffId, Puff, BodySize, EyeColor, EarSize, BodyColor, Sex, PuffTraits } from "./puff";
export { deriveTraits, createPuff, randomGenes, meiosis, DEFAULT_MUTATION_RATE } from "./puff";
export type { TraitKey, TraitRequirement, Request } from "./request";
export {
  calculateRequestReward,
  generateRequest,
  puffSatisfiesRequest,
  BASE_REQUEST_REWARD,
  PER_TRAIT_REWARD,
  MIN_REQUEST_TRAITS,
  MAX_REQUEST_TRAITS,
} from "./request";
