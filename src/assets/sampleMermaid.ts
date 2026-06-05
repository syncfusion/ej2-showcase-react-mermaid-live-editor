// ─── Sample Mermaid snippets ──────────────────────────────────────────────────

export const SAMPLE_FLOWCHART = `flowchart TD
  A[Start] --> B(Process)
  B -.- C{Decision}
  C --Yes--> D[Plan 1]
  C ==>|No| E[Plan 2]
  style A fill:#90EE90,stroke:#333,stroke-width:2px;
  style B fill:#4682B4,stroke:#333,stroke-width:2px;
  style C fill:#FFD700,stroke:#333,stroke-width:2px;
  style D fill:#FF6347,stroke:#333,stroke-width:2px;
  style E fill:#FF6347,stroke:#333,stroke-width:2px;`;

export const SAMPLE_SEQUENCE = `sequenceDiagram
  participant User
  participant Controller
  participant Service
  participant Database

  User->>Controller: sendRequest()
  activate Controller

  Controller->>Service: processRequest()
  activate Service

  Service->>Database: queryData()
  activate Database
  Database-->>Service: returnData()
  deactivate Database

  Service-->>Controller: returnResponse()
  deactivate Service

  Controller-->>User: sendResponse()
  deactivate Controller`;

export const SAMPLE_MINDMAP = `mindmap
  root((mindmap))
    Origins
      Long history
      ::icon(fa fa-book)
      Popularisation
        British popular psychology author Tony Buzan
    Research
      On effectiveness<br/>and features
      On Automatic creation
        Uses
            Creative techniques
            Strategic planning
            Argument mapping
    Tools
      Pen and paper
      Mermaid`;

export type SampleKey = 'sample-flowchart' | 'sample-sequence' | 'sample-mindmap';

export const SAMPLES: Record<SampleKey, string> = {
  'sample-flowchart': SAMPLE_FLOWCHART,
  'sample-sequence': SAMPLE_SEQUENCE,
  'sample-mindmap': SAMPLE_MINDMAP,
};

export const DEFAULT_SAMPLE = SAMPLE_FLOWCHART;
