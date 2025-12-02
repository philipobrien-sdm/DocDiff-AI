import { GoogleGenAI, Type } from "@google/genai";
import { TrackedItem, AnalysisResult, ChangeType, AnalysisStatus, CommentaryAnalysis, IntelligentDiffAnalysis, AnalysisContext, DiffSection } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeChanges = async (
  newDocText: string,
  items: TrackedItem[]
): Promise<AnalysisResult[]> => {
  if (items.length === 0) return [];
  
  const ai = getAiClient();

  const prompt = `
    You are an expert document editor. 
    I will provide the text of a NEW version of a document.
    I will also provide a JSON list of tracked changes/comments from the PREVIOUS version.
    
    For each item:
    1. Determine its status in the NEW document (ACCEPTED, ADDRESSED, NOT_ACTIONED, NO_LONGER_RELEVANT).
    2. Score the item on the following dimensions (Scale 1-5 where 1 is Low/Poor and 5 is High/Good):
       - implication: Select one from [Clarification, Editorial, Change, Significant Change].
       - alignment: Alignment with document goals (1-5).
       - feasibility: Feasibility of the suggestion/change (1-5).
       - futureAcceptance: Likelihood of acceptance in future revisions (1-5).
       - authorAcceptability: Likelihood of being acceptable to the original author (1-5).

    Strict definitions for Status:
    - ACCEPTED: Insertion present or Deletion absent.
    - ADDRESSED: Comment feedback implemented.
    - NOT_ACTIONED: Insertion missing, Deletion present, or Comment ignored.
    - NO_LONGER_RELEVANT: Context gone.

    Return a JSON array.
  `;

  // Simplify payload to save tokens
  const itemsPayload = items.map(item => ({
    id: item.id,
    type: item.type,
    text: item.text,
    context: item.context,
    commentContent: item.commentContent
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'user', parts: [{ text: `--- NEW DOCUMENT TEXT START ---\n${newDocText}\n--- NEW DOCUMENT TEXT END ---` }] },
        { role: 'user', parts: [{ text: `--- ITEMS TO CHECK START ---\n${JSON.stringify(itemsPayload)}\n--- ITEMS TO CHECK END ---` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemId: { type: Type.STRING },
              status: { 
                type: Type.STRING, 
                enum: ["ACCEPTED", "ADDRESSED", "NOT_ACTIONED", "NO_LONGER_RELEVANT", "UNKNOWN"]
              },
              explanation: { type: Type.STRING },
              scoring: {
                type: Type.OBJECT,
                properties: {
                  implication: { type: Type.STRING, enum: ['Clarification', 'Editorial', 'Change', 'Significant Change'] },
                  alignment: { type: Type.INTEGER },
                  feasibility: { type: Type.INTEGER },
                  futureAcceptance: { type: Type.INTEGER },
                  authorAcceptability: { type: Type.INTEGER }
                },
                required: ['implication', 'alignment', 'feasibility', 'futureAcceptance', 'authorAcceptability']
              }
            },
            required: ["itemId", "status", "explanation", "scoring"]
          }
        }
      }
    });

    const resultJson = response.text;
    if (!resultJson) return [];
    
    const results = JSON.parse(resultJson) as any[];
    
    return results.map((r: any) => ({
      itemId: r.itemId,
      status: r.status as AnalysisStatus,
      explanation: r.explanation,
      scoring: r.scoring,
      confidence: 1.0
    }));

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const analyzeCommentary = async (docText: string): Promise<CommentaryAnalysis> => {
  const ai = getAiClient();
  const prompt = `
    Analyze the following "Comment Response" document content. This document typically contains contributor comments, suggested changes, and author responses.
    
    Provide a structured analysis with the following 4 distinct sections:
    1. Success Patterns: What kind of changes or comments generally get accepted? (e.g., formatting, grammar, structural, conceptual).
    2. Tone Analysis: What is the tone of the contributors vs the authors? (e.g., constructive, defensive, formal, casual).
    3. Contributor Insights: Are there patterns specific to different contributors? (If names are present).
    4. Other Insights: Any other observations about the collaboration dynamic.

    Return the result as a JSON object.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'user', parts: [{ text: docText }] }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          successPatterns: { type: Type.STRING },
          toneAnalysis: { type: Type.STRING },
          contributorInsights: { type: Type.STRING },
          otherInsights: { type: Type.STRING }
        },
        required: ["successPatterns", "toneAnalysis", "contributorInsights", "otherInsights"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI for commentary analysis");
  return JSON.parse(text) as CommentaryAnalysis;
};

export const analyzeIntelligentDiff = async (
    oldText: string, 
    newText: string, 
    items: TrackedItem[],
    itemAnalysisResults?: Map<string, AnalysisResult>,
    context?: AnalysisContext
): Promise<IntelligentDiffAnalysis> => {
  const ai = getAiClient();
  
  const contextPrompt = context ? `
    CONTEXT FOR ANALYSIS:
    - Document Perspective: ${context.documentPerspective}
    - Intended Recipient of Report: ${context.intendedRecipient}
    - Report Style: ${context.reportStyle}
    - Specific Focus Areas: ${context.focusArea}
    - General Context/Background: ${context.generalContext}

    ${context.stakeholderPriorities ? `
    - REFERENCE STAKEHOLDER PRIORITIES DOCUMENT: 
      (Use the content below as the ground truth for what stakeholders value and require)
      """
      ${context.stakeholderPriorities.substring(0, 15000)} 
      """
    ` : ''}

    Adjust the language, depth, and focus of your "summary", "keyChanges", and "riskProfile" to match the Recipient and Report Style provided above.
    Ensure you specifically address the "Specific Focus Areas" if provided.
    Use the "General Context/Background" to inform your understanding of the document's purpose and history.
    
    CRITICAL: If a REFERENCE STAKEHOLDER PRIORITIES DOCUMENT is provided, you MUST compare the changes in the document against these priorities. 
    Highlight where changes deviate from or support these priorities in the "outstandingIssues" and "stakeholderPriorities" sections.
  ` : "";

  const prompt = `
    You are a high-level strategic document analyst (e.g., Senior Legal Counsel or Editor-in-Chief).
    I will provide you with an OLD version and a NEW version of a document, along with the TRACKED CHANGES/COMMENTS from the old version.
    
    ${contextPrompt}
    
    I will also provide AI-generated SCORES for each item (Implication, Alignment, Feasibility, etc.). 
    USE THESE SCORES TO FOCUS YOUR ANALYSIS ON THE MOST SIGNIFICANT ITEMS (e.g. "Significant Change" with low alignment or high author acceptability).
    
    Perform a holistic comparison of the two texts. Ignore minor copy edits, typos, or formatting changes.
    Focus on SUBSTANTIVE, SEMANTIC, and STRATEGIC changes.
    
    Provide the following output:
    1. summary: A concise executive summary of what has changed overall.
    2. keyChanges: A list of the top 3-5 most critical provisions or sections that changed, describing the change and its practical impact.
    3. strategicShifts: Analysis of how the document's purpose, tone, or direction has shifted.
    4. riskProfile: How has the risk allocation or liability profile changed? (e.g., "Shifted risk to the vendor", "Added new compliance requirements", "Neutral").
    5. outstandingIssues: An analysis of UNRESOLVED concerns based on the provided COMMENTS and tracked changes. Identify specific risks that seem open or contentious, assign a severity (High/Medium/Low), and suggest a remediation strategy for each.
    6. stakeholderPriorities: Analyze the implied priorities of the specific STAKEHOLDERS (authors found in the tracked changes/comments metadata). 
       - If specific author names are present in the 'author' field, YOU MUST USE THEM (e.g. "Alice Smith", "jdoe").
       - If the author is listed as "Unknown", do NOT use "Unknown". Instead, infer the stakeholder group or role based on the content of their comments (e.g. "Comments supporting Vendor Interests", "Legal Review Team").
       - Group by stakeholder.
       - For each key stakeholder (max 5), identify:
         - primaryConcerns: Identify themes/clauses they focused on. REQUIRED: Provide direct EVIDENCE for each concern using quotes from their comments (e.g. "Commented 'Too risky' on Indemnity (Section 12.1)", "Deleted the non-compete clause").
         - outcomeSummary: Were their proposals accepted, rejected, or compromised on?
         - projectedWants: Based on the pattern of rejections/acceptances, what will they likely insist on in the next draft?

    Return as JSON.
  `;

  // Filter items to reduce token count if necessary, but pass relevant comments
  const commentsPayload = items.filter(i => i.type === 'COMMENT' || i.type === 'DELETION' || i.type === 'INSERTION').map(i => {
      const analysis = itemAnalysisResults?.get(i.id);
      return {
          type: i.type,
          author: i.author || "Unknown",
          content: i.type === 'COMMENT' ? i.commentContent : i.text,
          context: i.context,
          scores: analysis?.scoring // Pass scores to context
      };
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'user', parts: [{ text: `--- OLD DOCUMENT VERSION --- \n ${oldText}` }] },
      { role: 'user', parts: [{ text: `--- NEW DOCUMENT VERSION --- \n ${newText}` }] },
      { role: 'user', parts: [{ text: `--- RELEVANT COMMENTS/CHANGES WITH SCORES --- \n ${JSON.stringify(commentsPayload)}` }] }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyChanges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                impact: { type: Type.STRING }
              }
            }
          },
          strategicShifts: { type: Type.STRING },
          riskProfile: { type: Type.STRING },
          outstandingIssues: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    issue: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                    remediation: { type: Type.STRING }
                }
            }
          },
          stakeholderPriorities: {
             type: Type.ARRAY,
             items: {
                 type: Type.OBJECT,
                 properties: {
                     stakeholder: { type: Type.STRING },
                     primaryConcerns: { type: Type.STRING },
                     outcomeSummary: { type: Type.STRING },
                     projectedWants: { type: Type.STRING }
                 }
             }
          }
        },
        required: ["summary", "keyChanges", "strategicShifts", "riskProfile", "outstandingIssues", "stakeholderPriorities"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI for intelligent diff");
  return JSON.parse(text) as IntelligentDiffAnalysis;
};

export const refineIntelligentDiff = async (
    oldText: string,
    newText: string,
    items: TrackedItem[],
    currentAnalysis: IntelligentDiffAnalysis,
    instruction: string,
    section: DiffSection
): Promise<Partial<IntelligentDiffAnalysis>> => {
  const ai = getAiClient();
  
  // Basic payload reduction for comments
  const commentsPayload = items.filter(i => i.type === 'COMMENT' || i.type === 'DELETION' || i.type === 'INSERTION').map(i => ({
      type: i.type,
      author: i.author || "Unknown",
      content: i.type === 'COMMENT' ? i.commentContent : i.text,
      context: i.context
  }));

  const basePrompt = `
      You are an expert document analyst.
      The user wants to REFINE an existing analysis of a document comparison.
      
      User Instruction for Refinement: "${instruction}"
      
      I will provide the Document Texts and the Tracked Changes.
      I will also provide the CURRENT analysis content.
  `;

  // Define schema based on section
  let schema: any;
  let sectionPrompt = "";

  if (section === 'ALL') {
      sectionPrompt = `Re-generate the ENTIRE analysis JSON strictly adhering to the user's new instruction. Keep the same JSON structure.`;
      // Use the full schema from analyzeIntelligentDiff
      schema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyChanges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, impact: { type: Type.STRING } } } },
          strategicShifts: { type: Type.STRING },
          riskProfile: { type: Type.STRING },
          outstandingIssues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { issue: { type: Type.STRING }, severity: { type: Type.STRING }, remediation: { type: Type.STRING } } } },
          stakeholderPriorities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { stakeholder: { type: Type.STRING }, primaryConcerns: { type: Type.STRING }, outcomeSummary: { type: Type.STRING }, projectedWants: { type: Type.STRING } } } }
        }
      };
  } else {
      sectionPrompt = `Re-generate ONLY the "${section}" section of the analysis. Return a JSON object with a single key "${section}".`;
      // Create specific schema
      let propSchema;
      if (section === 'summary' || section === 'strategicShifts' || section === 'riskProfile') {
          propSchema = { type: Type.STRING };
      } else if (section === 'keyChanges') {
          propSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, impact: { type: Type.STRING } } } };
      } else if (section === 'outstandingIssues') {
          propSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { issue: { type: Type.STRING }, severity: { type: Type.STRING }, remediation: { type: Type.STRING } } } };
      } else if (section === 'stakeholderPriorities') {
          propSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { stakeholder: { type: Type.STRING }, primaryConcerns: { type: Type.STRING }, outcomeSummary: { type: Type.STRING }, projectedWants: { type: Type.STRING } } } };
      }

      schema = {
          type: Type.OBJECT,
          properties: { [section]: propSchema },
          required: [section]
      };
  }

  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
          { role: 'user', parts: [{ text: basePrompt }] },
          { role: 'user', parts: [{ text: sectionPrompt }] },
          { role: 'user', parts: [{ text: `--- CURRENT ANALYSIS (${section}) ---\n ${JSON.stringify(section === 'ALL' ? currentAnalysis : currentAnalysis[section])}` }] },
          { role: 'user', parts: [{ text: `--- OLD DOCUMENT VERSION --- \n ${oldText}` }] },
          { role: 'user', parts: [{ text: `--- NEW DOCUMENT VERSION --- \n ${newText}` }] },
          { role: 'user', parts: [{ text: `--- TRACKED CHANGES --- \n ${JSON.stringify(commentsPayload)}` }] }
      ],
      config: {
          responseMimeType: "application/json",
          responseSchema: schema
      }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI for refinement");
  return JSON.parse(text);
};

export const askAiGuidance = async (
    item: TrackedItem, 
    userQuery: string, 
    context?: AnalysisContext
): Promise<string> => {
    const ai = getAiClient();
    
    const contextPrompt = context ? `
        Context: The user views this document as "${context.documentPerspective}" and the audience is "${context.intendedRecipient}".
        Focus Areas: ${context.focusArea}
        General Background: ${context.generalContext}
        ${context.stakeholderPriorities ? `Reference Stakeholder Priorities Provided.` : ''}
        Keep this perspective in mind.
    ` : "";

    const prompt = `
        You are a helpful document assistant.
        The user is asking a question about a specific tracked change or comment.
        
        Item Details:
        - Type: ${item.type}
        - Content: ${item.type === 'COMMENT' ? item.commentContent : item.text}
        - Context: ${item.context}
        
        ${contextPrompt}

        User Question: "${userQuery}"

        Provide a concise, practical answer or guidance. If the question implies a "What if", explore the potential consequence briefly.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return response.text || "No response generated.";
};