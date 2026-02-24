const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const rootDir = path.join(__dirname, '..');
const mdPath = path.join(rootDir, 'docs', 'architecture.md');
const outputDir = path.join(rootDir, 'docs', 'diagrams');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Read markdown file
const mdContent = fs.readFileSync(mdPath, 'utf-8');

// Extract mermaid code blocks
const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
const diagrams = [];
let match;
let diagramIndex = 0;

while ((match = mermaidRegex.exec(mdContent)) !== null) {
    diagramIndex++;
    diagrams.push({
        index: diagramIndex,
        code: match[1].trim()
    });
}

console.log(`Found ${diagrams.length} mermaid diagrams`);

// Render each diagram using puppeteer with mermaid.js
async function renderDiagrams() {
    const browser = await puppeteer.launch({ headless: 'new' });
    
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pi Monorepo Architecture</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #fff; }
        h1 { color: #1a1a1a; font-size: 28px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #444; margin-top: 50px; font-size: 20px; }
        .diagram { margin: 30px 0; page-break-inside: avoid; text-align: center; }
        .diagram .mermaid { 
            background: white; 
            padding: 20px;
        }
        .intro { color: #666; margin-bottom: 30px; line-height: 1.6; }
        .legend { 
            background: #f8f9fa; 
            padding: 15px; 
            margin: 15px 0; 
            border-radius: 5px;
            font-size: 14px;
        }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <h1>Pi Monorepo 系统架构图</h1>
    <div class="intro">
        <p>本文档包含 Pi monorepo 的完整系统架构图，涵盖所有核心包及其依赖关系。</p>
    </div>
`;

    // Add legend
    htmlContent += `
    <div class="legend">
        <strong>图例说明:</strong><br/>
        · 灰色箭头: 数据流/控制流<br/>
        · 虚线: 可选/异步调用
    </div>
`;

    // Generate HTML for each diagram
    for (const diag of diagrams) {
        htmlContent += `
    <div class="diagram">
        <h2>图 ${diag.index}</h2>
        <div class="mermaid">
${diag.code}
        </div>
    </div>
`;
    }

    htmlContent += `
    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
        <p>Generated from: docs/architecture.md</p>
    </div>
</body>
</html>`;

    // Write HTML for debugging
    const htmlPath = path.join(rootDir, 'docs', 'architecture.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log('HTML written to:', htmlPath);

    // Create PDF using puppeteer
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for mermaid to render
    await page.waitForFunction(() => {
        const diagrams = document.querySelectorAll('.mermaid');
        return Array.from(diagrams).every(d => d.querySelector('svg'));
    }, { timeout: 30000 });

    // Give extra time for any remaining rendering
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Creating PDF...');
    
    await page.pdf({
        path: path.join(rootDir, 'docs', 'architecture.pdf'),
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });

    await browser.close();
    console.log('PDF created successfully!');
}

renderDiagrams().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
