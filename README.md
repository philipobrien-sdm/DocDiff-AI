# DocDiff AI - Intelligent Document Comparison & Strategy Tool

**AI-powered document review that goes beyond "Track Changes." Compare previous tracked versions against new drafts to extract strategic insights, score changes, and analyze stakeholder priorities.**

<img width="1669" height="998" alt="Screenshot 2025-12-02 204226" src="https://github.com/user-attachments/assets/2be789db-09ab-4b13-af36-70c65583b7bb" />


## About The Project

**DocDiff AI** is an advanced document analysis tool designed for legal professionals, contract managers, and editors. While standard word processors show you *what* changed (redlines), DocDiff AI uses **Google Gemini 2.5 Flash** to explain *why* it matters.

It takes a previous version of a file (containing tracked changes and comments) and compares it item-by-item against a new clean version. The application acts as an intelligent "second pair of eyes," scoring every change based on its strategic implication, feasibility, and alignment with your goals.

Key capabilities include:
1.  **Holistic Strategic Analysis**: Generates an "Intelligent Diff" executive summary, analyzing shifts in risk profiles and strategic direction.
2.  **Item-Level Scoring**: rates every insertion, deletion, and comment on a 1-5 scale for dimensions like "Future Acceptance" and "Author Acceptability."
3.  **Stakeholder Profiling**: Infers the priorities and future demands of specific contributors based on their comment history.
4.  **Interactive Refinement**: Allows users to guide the AI to refine specific sections of the analysis (e.g., "Focus more on liability caps").

## Key Features

*   **Multi-File Context**: Upload a Previous Version (Tracked), a New Version (Clean), and optional context files (Response Docs or Stakeholder Priorities) for a comprehensive review.
*   **Context-Aware Analysis**: Configure the AI with your specific perspective (e.g., "We are the Vendor," "Recipient is Legal Team") to tailor the tone and focus of the report.
*   **Visual Analysis Views**:
    *   **Grid View**: Sortable cards showing every change with its AI-generated impact score.
    *   **Timeline View**: A chronological playback of edits and comments.
    *   **Document View**: See the changes mapped directly onto the new document text.
    *   **Intelligent Diff**: A high-level strategic report summarizing risk, key provisions, and outstanding issues.
    *   **Insights**: Analysis of contributor tone and success patterns.
*   **"Ask AI" Guidance**: Click specifically on any tracked change to ask "What if we reject this?" or "Is this standard?"
*   **Export & Session Management**: Generate full HTML reports to share with stakeholders, or save your analysis session to JSON to resume work later.
*   **Privacy-First Architecture**: Document parsing (`.docx`) happens entirely in the browser using `JSZip`. Text is sent to the Gemini API for analysis, but no files are stored on an intermediate server.

## 🚀 How to Run on Google AI Studio 🚀

This project is designed to be run directly within Google AI Studio by uploading a `.zip` file. Follow these steps carefully to ensure the file structure is correct.

### Step 1: Download the Project from GitHub
1.  On the main page of this GitHub repository, click the green **< > Code** button.
2.  In the dropdown menu, select **Download ZIP**.
3.  Save the file to your computer.

### Step 2: Prepare the ZIP for AI Studio
This is the most important step. AI Studio requires the `index.html` file to be at the **top level** of the zip file.

1.  **Unzip** the downloaded file.
2.  **Open the folder**. Navigate inside until you see the project files (`index.html`, `App.tsx`, `package.json`, etc.).
3.  **Select the application files**. Select all the files and folders inside this directory.
    *   **Include**: `App.tsx`, `components/`, `services/`, `index.html`, `index.tsx`, `metadata.json`, `types.ts`, `README.md`.
4.  **Create the new ZIP file**. With all the app files selected, right-click and choose:
    *   **Windows**: Send to > Compressed (zipped) folder.
    *   **Mac**: Compress [X] items.
5.  **Rename** the new ZIP file to something clear, like `docdiff-upload.zip`.

**CRITICAL**: By zipping the *contents* directly, you ensure that `index.html` is at the root of your new zip file, which is what AI Studio needs.

### Step 3: Upload and Run in AI Studio
1.  **Go to Google AI Studio**: Open your web browser and navigate to [aistudio.google.com](https://aistudio.google.com).
2.  **Create a New Project**: Start a blank, new project.
3.  **Upload Your ZIP**: Find the option to upload files (often a button or a drag-and-drop area) and select the `docdiff-upload.zip` file you created in the previous step.
4.  **Run the App**: AI Studio will automatically unzip the files, build the project, and launch the application in the preview panel.
5.  **Interact**:
    *   Upload two `.docx` files (one with tracked changes, one clean).
    *   Set your "Context" (e.g., Perspective: Buyer).
    *   Click "Start Analysis" and watch the AI break down your document.

## Technical Deep Dive

For those interested in the code, here are the key files to look at:

*   **`services/docxService.ts`**: Handles the client-side parsing of `.docx` files (unzipping the XML structure) to extract paragraphs, tracked changes (`<w:ins>`, `<w:del>`), and comments.
*   **`services/geminiService.ts`**: The interface to the Google Gemini API. This contains the prompt engineering for:
    *   `analyzeChanges`: Scoring individual items.
    *   `analyzeIntelligentDiff`: Generating the strategic executive summary.
    *   `refineIntelligentDiff`: Handling user requests to rewrite specific analysis sections.
*   **`components/IntelligentDiffView.tsx`**: The UI for the high-level report, including the logic for the "Refine" modal.
*   **`App.tsx`**: The main controller handling state, file inputs, view switching, and the "Reset" logic.
*   **`types.ts`**: Defines the data structures for `TrackedItem`, `AnalysisResult`, and `ScoringAnalysis`.

---


