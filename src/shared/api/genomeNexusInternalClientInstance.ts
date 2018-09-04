import {getGenomeNexusApiUrl} from "./urls";
import GenomeNexusAPIInternal from "./generated/GenomeNexusAPIInternal";

const client = new GenomeNexusAPIInternal("https://genomenexus.herokuapp.com");

export default client;
