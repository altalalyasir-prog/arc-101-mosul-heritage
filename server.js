const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const vm = require('vm');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve the whole directory

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'assets', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `item_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// API: Upload Media
app.post('/api/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `assets/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// API: Add Archive Item
app.post('/api/archive', (req, res) => {
  const newItem = req.body;
  const dataPath = path.join(__dirname, 'data.js');

  try {
    // Read and parse current data.js using VM to safely evaluate JS
    let content = fs.readFileSync(dataPath, 'utf8');
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(content, context);
    
    // Support either window.ARCHIVE_DATA or const ARCHIVE_DATA globally in VM
    let archiveData = context.window.ARCHIVE_DATA || context.ARCHIVE_DATA;
    if (!archiveData) {
      // Fallback regex if vm fails to bind it
      const match = content.match(/const\s+ARCHIVE_DATA\s*=\s*(\[[\s\S]*\]);/);
      if (match) {
        archiveData = eval(match[1]);
      }
    }

    if (!Array.isArray(archiveData)) {
      throw new Error("Could not parse ARCHIVE_DATA array.");
    }

    // Assign ID
    newItem.id = `IDH-2026-${String(archiveData.length + 1).padStart(3, '0')}`;
    
    // Add to beginning of array
    archiveData.unshift(newItem);

    // Serialize back to file format
    const newFileContent = `const ARCHIVE_DATA = ${JSON.stringify(archiveData, null, 2)};\n\nif (typeof window !== 'undefined') {\n  window.ARCHIVE_DATA = ARCHIVE_DATA;\n}`;
    
    fs.writeFileSync(dataPath, newFileContent, 'utf8');
    res.json({ success: true, item: newItem });

  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data.js' });
  }
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` Archiving 101 Admin Server is running!`);
  console.log(` Dashboard URL: http://localhost:${PORT}/admin.html`);
  console.log(`========================================\n`);
});
