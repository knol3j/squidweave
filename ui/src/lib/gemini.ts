import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const marketingModel = {
  async generateCopy(prompt: string, activeModules?: string[]) {
    const modulesContext = activeModules && activeModules.length > 0 
      ? `\n\nACTIVATED MCP AUTOMATION TOOLS:\n${activeModules.map(m => `- ${m}`).join('\n')}\n` +
        `When these tools are active, you MUST integrate them into your strategy and execution plans. ` +
        `Use [TOOL_ACTION: ModuleName -> Specific Action] tags frequently in your output to indicate where an MCP tool triggers. ` +
        `Example actions: \n` +
        `- [TOOL_ACTION: AdSync -> Deploy to Meta Pixel Event]\n` +
        `- [TOOL_ACTION: EmailFlow -> Trigger Abandoned Cart sequence in Hubspot]\n` +
        `- [TOOL_ACTION: InfluencerConnect -> Scan TikTok for #EcoTech creators]\n` +
        `- [TOOL_ACTION: CopySentinel -> Check brand tone against 2024 Guidelines]\n` +
        `- [TOOL_ACTION: PixelRetarget -> Build LAL audience from high-LTV users]`
      : '';

    const systemInstruction = `
      You are a high-stakes marketing strategist and growth engineer. 
      CRITICAL: Avoid "sycophantic" AI behavior. Do not blindly agree with the user. If their premise is flawed, the branding is weak, or a market segment is oversaturated, call it out. 
      Your goal is to create data-driven, high-converting marketing strategies grounded in real-world facts.${modulesContext}
      
      CRITICAL RESEARCH MANDATE:
      - If the user mentions a specific product, brand, or niche, you MUST use the Google Search tool to pull current market benchmarks, competitor activity, and audience pain points.
      - Never hallucinate data. Ground your strategy in real-world feasibility.
      - If the search results are inconclusive, flag this as a risk in the strategy.

      COPY SENTINEL PROTOCOL:
      - You have the Copy Sentinel MCP module active.
      - Before outputting any Ad Copy or Social Media content, you MUST run a virtual tone check.
      - Use the tag [TOOL_ACTION: CopySentinel -> Check brand tone against 2024 Guidelines] to signify this validation is taking place.
      - Ensure all content is compliant with the 2024 Brand Guidelines (Professional, Tech-Forward, Sustainable, and Authoritative).

      Structure your response with clear sections:
      1. [Campaign Strategy]: High-level vision informed by real-world research. Include a "Market Realities" subsection with specific data points.
      2. [Ad Copy]: Variations for primary channels.
      3. [Social Media Posts]: Captions for Instagram, Twitter, and LinkedIn.
      4. [Social Media Kit]: Provide specific creative directions for multi-platform visual assets:
         - [Instagram Reel / TikTok]: Detailed script, audio suggestions, and visual transitions.
         - [Carousel Post]: Slide-by-slide content, design prompts, and swipe-triggering copy.
         - [LinkedIn Video/Image]: Professional visual asset description and positioning.
      5. [SEO Keywords]: Relevant terms for discovery.

      Use professional, persuasive language.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.8,
      },
    });

    return response.text;
  },

  async generateBenchmarks(prompt: string) {
    const systemInstruction = `
      You are a performance marketing analyst.
      Research real-world performance benchmarks (CTR, Conversion Rate, CPC, ROAS) for the industry/product described in the prompt.
      Use Google Search to find current 2024 data.
      
      Return ONLY a JSON object with:
      - kpis: Array of 4 KPI objects { label, value, trend, sentiment }
      - trajectory: Array of 7 data points { name, ctr, conv, spend } representing a realistic weekly performance curve based on industry averages.
      - platforms: Array of 4 objects { name, value, color } showing market share distribution.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    });

    return JSON.parse(response.text);
  },

  async generatePersonas(prompt: string) {
    const systemInstruction = `
      You are a target audience researcher.
      Analyze the product/brand using real-time data where possible.
      Identify 3 distinct target audience personas based on current market trends.
      
      Return ONLY a JSON array of personas. Each persona object must have:
      - name (string)
      - demographics (string)
      - pains (string array, max 3)
      - gains (string array, max 3)
      - engagementScore (number between 0.7 and 0.98)
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    return JSON.parse(response.text);
  },

  async generateVariations(prompt: string) {
    const systemInstruction = `
      You are a data-driven creative director.
      Generate 6 distinct ad variations based on current industry benchmarks and creative trends discovered via research.
      
      Return ONLY a JSON array of variations. Each variation object must have:
      - label (string, e.g. "Variation A (Disruptive)")
      - copy (string, ad copy)
      - ctr (number, industry benchmark estimate 1.0-5.0)
      - conv (number, industry benchmark estimate 1.0-4.0)
      - image (string|null, only include a real sourced asset URL if one already exists; otherwise null)
      - status (string, "contender")
      - platform (string, e.g. "Instagram/TikTok")
      - audience (string, segment name)
      - trend (string, "up" or "stable")
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.9,
      },
    });

    return JSON.parse(response.text);
  },

  async generateKeywords(prompt: string) {
    const systemInstruction = `
      You are an SEO and search intent specialist.
      Perform research using Google Search to identify the top 10 high-value, high-intent SEO keywords related to the user's prompt.
      
      Return ONLY a JSON array of keywords. Each keyword object must have:
      - term (string)
      - volume (string, approximate monthly search volume e.g. "12k")
      - difficulty (string, "Low", "Medium", or "High")
      - intent (string, "Informational", "Commercial", or "Transactional")
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    });

    return JSON.parse(response.text);
  },

  async analyzeAssets(fileBase64: string, mimeType: string, prompt: string, activeModules?: string[]) {
    const modulesContext = activeModules && activeModules.length > 0 
      ? `\n\nActive context: ${activeModules.join(', ')} automation is available. Use [TOOL_ACTION: ModuleName -> Action] tags if the visual analysis suggests an automated follow-up.`
      : '';

    const systemInstruction = `
      You are a visual marketing expert. Analyze the provided image/asset and provide marketing insights.${modulesContext}
      Suggest how this asset could be used in a campaign and provide copy that complements it.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text;
  }
};
