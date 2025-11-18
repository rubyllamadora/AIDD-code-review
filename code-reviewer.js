import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import fs from "fs";
import path from "path";
import { getConfig } from "./config.js";

class CodeReviewer {
    constructor(configType = "quick") {
      this.config = getConfig(configType);
      this.model = this.config.model;
      this.maxTokens = this.config.maxTokens;
    }

    async reviewFile(fileName) {
      try {
        const code = fs.readFileSync(fileName, "utf-8");
        const fileExtension = path.extname(fileName);
        const language = this.detectLanguage(fileExtension);

        const analysis = await this.analyzeCode(code, fileName, language);

        return {
          fileName,
          language,
          analysis,
          timestamp: new Date().toISOString()
        }
      } catch (e) {
        return {
          fileName,
          error: e.message,
          timestamp: new Date().toISOString()
        }
      }
    }

    detectLanguage(extension) {
      const languages = {
        ".js": "Javascript",
        ".ts": "Typescript",
        ".php": "PHP",
      }

      return languages[extension] || "Unknown";
    }

    async analyzeCode(code, fileName, language) {
      const prompt = `You are an expert code reviewer focusing on ${this.config.focus}. 
      Analyze this ${language} code with emphasis on ${this.config.focus}:

      1. **Bugs and logic issues** - Potential runtime errors, edge cases, off-by-one errors
      2. **Performance** - Inefficient algorithms, memory leaks, unnecessary operations
      3. **Security issues** - Input validation, SQL injection, XSS vulnerabilities
      4. **Code quality** - Code style, readability, maintainability, adherence to best practices
      5. **Testing gaps** - Missing test cases, untestable code patterns
      
      Code to review (${fileName})
      ${code}
      
      Provide specific, actionable feedback in this format:
      - **Issue Type**: Brief description
      - **Location**: Line number or function name
      - **Problem**: What's wrong
      - **Fix**: Suggested fix for the issue
      - **Priority**: Low/Medium/High

      Focus on the issues that could improve code quality, performance, or prevent bugs.`;
      
      const { text } = await generateText({
        model: openai(this.model),
        maxTokens: this.maxTokens,
        prompt,
      });

      return text;
    }
}

async function main() {
    const fileName = process.argv[2];

    if (!fileName) {
        console.log("Usage: node code-reviewer.js <filename>");
        console.log("Example: node code-reviewer.js ./test.js");
        process.exit(1);
    }

    if (!fs.existsSync(fileName)) {
        console.log(`File not found: ${fileName}`);
        process.exit(1);
    }

    console.log(`Reviewing ${fileName}...`);

    const reviewer = new CodeReviewer();
    const result = await reviewer.reviewFile(fileName);
    
    if (result.error) {
        console.log(`Error reviewing ${fileName}: ${result.error}`);
        process.exit(1);
        return;
    }

    console.log(`Code Review results for ${fileName}`);
    console.log("Language: ", result.language);
    console.log("Reviewed at: ", result.timestamp);
    console.log("\n" + "=".repeat(60));
    console.log(result.analysis);
    console.log("=".repeat(60));
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { CodeReviewer };