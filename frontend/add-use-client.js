const fs = require('fs');
const path = require('path');

const CLIENT_API_REGEX = /\b(useState|useEffect|useRef|useReducer|useContext|useMemo|useCallback|useRouter|usePathname|useSearchParams|onClick|onChange|onKeyDown|onKeyUp|onKeyPress|onSubmit|onFocus|onBlur|onMouseEnter|onMouseLeave|localStorage|sessionStorage|createContext)\b|framer-motion|\bwindow\b|\bdocument\b/;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist' && file !== '.git') {
        scanDir(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('"use client"') || content.includes("'use client'")) {
    return;
  }
  
  if (CLIENT_API_REGEX.test(content)) {
    console.log(`Adding "use client"; to ${filePath}`);
    fs.writeFileSync(filePath, '"use client";\n\n' + content);
  }
}

const frontendDir = '/home/kimtsuny/Desktop/anime-catalog/frontend';
scanDir(frontendDir);
console.log("Done checking files.");
