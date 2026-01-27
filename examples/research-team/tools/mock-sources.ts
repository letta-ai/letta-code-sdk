/**
 * Mock Academic Sources
 * 
 * Simulated academic papers for demo without external APIs.
 * Covers multiple domains with realistic metadata.
 */

import type { AcademicSource } from '../types.js';

export const MOCK_SOURCES: AcademicSource[] = [
  // ═══════════════════════════════════════════════════════════════
  // QUANTUM COMPUTING
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'qc-001',
    title: 'Surface Codes: Towards Practical Large-Scale Quantum Computation',
    authors: ['Fowler, A.G.', 'Mariantoni, M.', 'Martinis, J.M.', 'Cleland, A.N.'],
    abstract: 'We present a comprehensive review of surface code quantum error correction, including an introduction to the theory, practical considerations for implementation, and current experimental progress toward fault-tolerant quantum computing.',
    venue: 'Physical Review A',
    year: 2012,
    citations: 2847,
    domain: 'quantum-computing',
    quality: 9,
  },
  {
    id: 'qc-002',
    title: 'Quantum Error Correction for Beginners',
    authors: ['Devitt, S.J.', 'Munro, W.J.', 'Nemoto, K.'],
    abstract: 'We provide a pedagogical introduction to quantum error correction, covering the basics of classical error correction, the quantum no-cloning theorem, stabilizer codes, and the threshold theorem for fault-tolerant quantum computation.',
    venue: 'Reports on Progress in Physics',
    year: 2013,
    citations: 1523,
    domain: 'quantum-computing',
    quality: 8,
  },
  {
    id: 'qc-003',
    title: 'Quantum Supremacy Using a Programmable Superconducting Processor',
    authors: ['Arute, F.', 'Arya, K.', 'Babbush, R.', 'et al.'],
    abstract: 'We report the use of a processor with programmable superconducting qubits to create quantum states on 53 qubits, corresponding to a computational state-space of dimension 2^53. We demonstrate quantum supremacy by sampling the output of a pseudo-random quantum circuit.',
    venue: 'Nature',
    year: 2019,
    citations: 4521,
    domain: 'quantum-computing',
    quality: 10,
  },
  {
    id: 'qc-004',
    title: 'Logical Quantum Processor Based on Reconfigurable Atom Arrays',
    authors: ['Bluvstein, D.', 'Evered, S.J.', 'Geim, A.A.', 'et al.'],
    abstract: 'We present a logical quantum processor based on reconfigurable arrays of neutral atoms, demonstrating the execution of quantum algorithms on 48 logical qubits with error correction.',
    venue: 'Nature',
    year: 2024,
    citations: 342,
    domain: 'quantum-computing',
    quality: 9,
  },

  // ═══════════════════════════════════════════════════════════════
  // LARGE LANGUAGE MODELS / AI
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'ai-001',
    title: 'Attention Is All You Need',
    authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.', 'et al.'],
    abstract: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments show these models achieve superior results on machine translation tasks.',
    venue: 'NeurIPS',
    year: 2017,
    citations: 98234,
    domain: 'artificial-intelligence',
    quality: 10,
  },
  {
    id: 'ai-002',
    title: 'Language Models are Few-Shot Learners',
    authors: ['Brown, T.B.', 'Mann, B.', 'Ryder, N.', 'et al.'],
    abstract: 'We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance, achieving strong results on many NLP datasets without task-specific fine-tuning. GPT-3 achieves strong performance in the few-shot setting.',
    venue: 'NeurIPS',
    year: 2020,
    citations: 24567,
    domain: 'artificial-intelligence',
    quality: 10,
  },
  {
    id: 'ai-003',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    authors: ['Wei, J.', 'Wang, X.', 'Schuurmans, D.', 'et al.'],
    abstract: 'We explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning tasks.',
    venue: 'NeurIPS',
    year: 2022,
    citations: 3456,
    domain: 'artificial-intelligence',
    quality: 9,
  },
  {
    id: 'ai-004',
    title: 'Constitutional AI: Harmlessness from AI Feedback',
    authors: ['Bai, Y.', 'Kadavath, S.', 'Kundu, S.', 'et al.'],
    abstract: 'We present Constitutional AI, a method for training harmless AI assistants without human feedback labels for harmfulness. Our approach uses a set of principles to guide the model toward helpful, harmless, and honest behavior.',
    venue: 'arXiv',
    year: 2022,
    citations: 1234,
    domain: 'artificial-intelligence',
    quality: 8,
  },
  {
    id: 'ai-005',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: ['Lewis, P.', 'Perez, E.', 'Piktus, A.', 'et al.'],
    abstract: 'We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) models which combine pre-trained parametric and non-parametric memory for language generation.',
    venue: 'NeurIPS',
    year: 2020,
    citations: 2891,
    domain: 'artificial-intelligence',
    quality: 9,
  },

  // ═══════════════════════════════════════════════════════════════
  // CLIMATE SCIENCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'clim-001',
    title: 'Global Warming of 1.5°C: IPCC Special Report',
    authors: ['IPCC'],
    abstract: 'This report assesses the impacts of global warming of 1.5°C above pre-industrial levels and related global greenhouse gas emission pathways, in the context of strengthening the global response to climate change.',
    venue: 'IPCC',
    year: 2018,
    citations: 15234,
    domain: 'climate-science',
    quality: 10,
  },
  {
    id: 'clim-002',
    title: 'Ice Sheet Contributions to Future Sea-Level Rise',
    authors: ['DeConto, R.M.', 'Pollard, D.'],
    abstract: 'We present ice sheet simulations coupled to climate forcing that project substantial Antarctic ice sheet contributions to sea-level rise under high-emission scenarios, potentially exceeding 1 meter by 2100.',
    venue: 'Nature',
    year: 2016,
    citations: 3421,
    domain: 'climate-science',
    quality: 9,
  },
  {
    id: 'clim-003',
    title: 'Carbon Capture and Storage: Technology and Applications',
    authors: ['Boot-Handford, M.E.', 'Abanades, J.C.', 'Anthony, E.J.', 'et al.'],
    abstract: 'We provide a comprehensive review of carbon capture and storage technologies, including post-combustion, pre-combustion, and oxy-fuel processes, as well as geological storage options.',
    venue: 'Energy & Environmental Science',
    year: 2014,
    citations: 2156,
    domain: 'climate-science',
    quality: 8,
  },

  // ═══════════════════════════════════════════════════════════════
  // NEUROSCIENCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'neuro-001',
    title: 'The Default Mode Network: Self-Reference and Internal Mentation',
    authors: ['Buckner, R.L.', 'Andrews-Hanna, J.R.', 'Schacter, D.L.'],
    abstract: 'We review evidence that the default mode network supports internally-directed cognition, including autobiographical memory retrieval, envisioning the future, and conceiving the perspectives of others.',
    venue: 'Annals of the New York Academy of Sciences',
    year: 2008,
    citations: 5678,
    domain: 'neuroscience',
    quality: 9,
  },
  {
    id: 'neuro-002',
    title: 'Optogenetics: Development and Application',
    authors: ['Deisseroth, K.'],
    abstract: 'Optogenetics combines genetic targeting of specific neurons with optical control, enabling causal investigation of neural circuits with millisecond precision in behaving animals.',
    venue: 'Nature Methods',
    year: 2011,
    citations: 4521,
    domain: 'neuroscience',
    quality: 10,
  },
  {
    id: 'neuro-003',
    title: 'Memory Engrams: Recalling the Past and Imagining the Future',
    authors: ['Josselyn, S.A.', 'Tonegawa, S.'],
    abstract: 'We discuss how specific neuronal ensembles, or engrams, support memory storage and retrieval, and how optogenetic manipulation of these cells can artificially activate or suppress memories.',
    venue: 'Science',
    year: 2020,
    citations: 1234,
    domain: 'neuroscience',
    quality: 9,
  },

  // ═══════════════════════════════════════════════════════════════
  // BIOTECHNOLOGY / CRISPR
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bio-001',
    title: 'A Programmable Dual-RNA-Guided DNA Endonuclease in Adaptive Bacterial Immunity',
    authors: ['Jinek, M.', 'Chylinski, K.', 'Fonfara, I.', 'et al.'],
    abstract: 'We demonstrate that the Cas9 endonuclease can be programmed with guide RNA to cleave specific DNA sequences, establishing the foundation for CRISPR-Cas9 genome editing.',
    venue: 'Science',
    year: 2012,
    citations: 18234,
    domain: 'biotechnology',
    quality: 10,
  },
  {
    id: 'bio-002',
    title: 'Base Editing: Precision Chemistry on the Genome and Transcriptome',
    authors: ['Rees, H.A.', 'Liu, D.R.'],
    abstract: 'We review base editing, a genome editing approach that enables direct conversion of one base pair to another without double-stranded DNA breaks or donor DNA templates.',
    venue: 'Nature Reviews Genetics',
    year: 2018,
    citations: 2341,
    domain: 'biotechnology',
    quality: 9,
  },
  {
    id: 'bio-003',
    title: 'Prime Editing: Search-and-Replace Genome Editing',
    authors: ['Anzalone, A.V.', 'Randolph, P.B.', 'Davis, J.R.', 'et al.'],
    abstract: 'We develop prime editing, a versatile genome editing method that directly writes new genetic information into a specified DNA site without double-strand breaks or donor DNA.',
    venue: 'Nature',
    year: 2019,
    citations: 1876,
    domain: 'biotechnology',
    quality: 9,
  },

  // ═══════════════════════════════════════════════════════════════
  // MATERIALS SCIENCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'mat-001',
    title: 'Electric Field Effect in Atomically Thin Carbon Films',
    authors: ['Novoselov, K.S.', 'Geim, A.K.', 'Morozov, S.V.', 'et al.'],
    abstract: 'We describe preparation and characterization of graphene, a single atomic layer of carbon. We observe the electric field effect and report carrier mobilities as high as 10,000 cm²/Vs.',
    venue: 'Science',
    year: 2004,
    citations: 45678,
    domain: 'materials-science',
    quality: 10,
  },
  {
    id: 'mat-002',
    title: 'Room-Temperature Superconductivity in a Carbonaceous Sulfur Hydride',
    authors: ['Snider, E.', 'Dasenbrock-Gammon, N.', 'McBride, R.', 'et al.'],
    abstract: 'We report superconductivity at 288 K (15°C) in a carbonaceous sulfur hydride system at a pressure of approximately 267 gigapascals.',
    venue: 'Nature',
    year: 2020,
    citations: 1234,
    domain: 'materials-science',
    quality: 7, // Later questioned
  },
  {
    id: 'mat-003',
    title: 'Perovskite Solar Cells: Recent Progress and Future Prospects',
    authors: ['Park, N.G.', 'Grätzel, M.', 'Miyasaka, T.', 'et al.'],
    abstract: 'We review the rapid progress in perovskite solar cell technology, discussing material properties, device architectures, and pathways to commercialization.',
    venue: 'Science',
    year: 2016,
    citations: 8765,
    domain: 'materials-science',
    quality: 9,
  },

  // ═══════════════════════════════════════════════════════════════
  // ECONOMICS / BEHAVIORAL SCIENCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'econ-001',
    title: 'Thinking, Fast and Slow: A Summary of Dual-Process Theory',
    authors: ['Kahneman, D.'],
    abstract: 'We present the dual-process theory of cognition, distinguishing between fast, intuitive System 1 thinking and slow, deliberate System 2 thinking, with implications for judgment and decision-making.',
    venue: 'American Economic Review',
    year: 2011,
    citations: 34567,
    domain: 'economics',
    quality: 10,
  },
  {
    id: 'econ-002',
    title: 'Nudge: Improving Decisions About Health, Wealth, and Happiness',
    authors: ['Thaler, R.H.', 'Sunstein, C.R.'],
    abstract: 'We explore how choice architecture can nudge people toward better decisions without restricting freedom of choice, with applications in policy design.',
    venue: 'Yale University Press',
    year: 2008,
    citations: 23456,
    domain: 'economics',
    quality: 9,
  },
];

/**
 * Search mock sources by query string
 */
export function searchMockSources(
  query: string, 
  limit: number = 10,
  domain?: string
): AcademicSource[] {
  const keywords = query.toLowerCase().split(/\s+/);
  
  let results = MOCK_SOURCES.filter(source => {
    // Domain filter
    if (domain && source.domain !== domain) {
      return false;
    }
    
    // Keyword matching in title and abstract
    const searchText = `${source.title} ${source.abstract}`.toLowerCase();
    return keywords.some(kw => searchText.includes(kw));
  });
  
  // Sort by relevance (keyword match count) then quality
  results.sort((a, b) => {
    const aText = `${a.title} ${a.abstract}`.toLowerCase();
    const bText = `${b.title} ${b.abstract}`.toLowerCase();
    
    const aMatches = keywords.filter(kw => aText.includes(kw)).length;
    const bMatches = keywords.filter(kw => bText.includes(kw)).length;
    
    if (aMatches !== bMatches) {
      return bMatches - aMatches; // More matches first
    }
    return b.quality - a.quality; // Higher quality first
  });
  
  return results.slice(0, limit);
}

/**
 * Get all available domains
 */
export function getAvailableDomains(): string[] {
  return [...new Set(MOCK_SOURCES.map(s => s.domain))];
}

/**
 * Format a source for display
 */
export function formatSource(source: AcademicSource): string {
  return `**${source.title}**
Authors: ${source.authors.join(', ')}
Venue: ${source.venue} (${source.year})
Citations: ${source.citations.toLocaleString()}
Quality Score: ${source.quality}/10

Abstract: ${source.abstract}
`;
}

/**
 * Format sources as markdown list
 */
export function formatSourcesMarkdown(sources: AcademicSource[]): string {
  return sources.map((s, i) => 
    `### Source ${i + 1}: ${s.title}
- **Authors**: ${s.authors.join(', ')}
- **Venue**: ${s.venue} (${s.year})
- **Citations**: ${s.citations.toLocaleString()}
- **Quality**: ${s.quality}/10
- **Domain**: ${s.domain}

> ${s.abstract}
`
  ).join('\n');
}
