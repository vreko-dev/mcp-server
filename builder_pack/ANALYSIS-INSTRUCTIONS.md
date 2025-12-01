# SnapBack Repository Analysis Instructions

## 🚀 Quick Start

### For Mac/Linux Users:

1. **Download the script** from the outputs folder
2. **Copy it to your SnapBack repository root**
3. **Run it:**

```bash
cd /path/to/your/snapback-repo
chmod +x analyze-snapback-repo.sh
./analyze-snapback-repo.sh
```

4. **Wait 1-3 minutes** while it analyzes everything
5. **Check results:**

```bash
cd snapback-analysis
ls -la
```

You'll see 16 files with all your repo information!

---

### For Windows Users:

If you don't have bash, here's a simplified PowerShell version:

**Save this as `analyze-snapback-repo.ps1`:**

```powershell
# SnapBack Repository Analysis Script (PowerShell)
Write-Host "🔍 Starting SnapBack repository analysis..."

# Create output directory
New-Item -ItemType Directory -Force -Path "snapback-analysis" | Out-Null
Set-Location "snapback-analysis"

# 1. Repository structure
Write-Host "📁 Analyzing repository structure..."
tree /F /A .. > 01-structure.txt

# 2. List packages
Get-ChildItem -Path "../packages" | Out-File -FilePath 02-packages.txt
Get-ChildItem -Path "../apps" | Out-File -FilePath 02-packages.txt -Append

# 3. All package.json files
Get-ChildItem -Path ".." -Recurse -Filter "package.json" |
  Where-Object { $_.FullName -notmatch "node_modules" } |
  ForEach-Object {
    "=== $($_.FullName) ===" | Out-File -FilePath 03-package-jsons.txt -Append
    Get-Content $_.FullName | Out-File -FilePath 03-package-jsons.txt -Append
  }

# 4. All tsconfig files
Get-ChildItem -Path ".." -Recurse -Filter "tsconfig*.json" |
  Where-Object { $_.FullName -notmatch "node_modules" } |
  ForEach-Object {
    "=== $($_.FullName) ===" | Out-File -FilePath 04-tsconfig.txt -Append
    Get-Content $_.FullName | Out-File -FilePath 04-tsconfig.txt -Append
  }

# 5. List all TypeScript files
Get-ChildItem -Path "..\packages","..\apps" -Recurse -Include "*.ts","*.tsx" |
  Where-Object { $_.FullName -notmatch "node_modules|dist|build" } |
  Select-Object -ExpandProperty FullName |
  Out-File -FilePath 05-typescript-files-list.txt

# 6. Source code (split into parts)
Write-Host "📝 Extracting TypeScript source code..."
$files = Get-Content 05-typescript-files-list.txt
$counter = 1
$fileCounter = 1
$outputFile = "06-source-code-part-$fileCounter.txt"
$lineCount = 0

"=== SOURCE CODE PART $fileCounter ===" | Out-File -FilePath $outputFile

foreach ($file in $files) {
  if (!(Test-Path $file)) { continue }

  $fileSize = (Get-Item $file).Length
  if ($fileSize -gt 1MB) {
    "⚠️  Skipping large file: $file ($([math]::Round($fileSize/1KB))KB)" | Out-File -FilePath $outputFile -Append
    continue
  }

  if ($lineCount -gt 5000) {
    $fileCounter++
    $outputFile = "06-source-code-part-$fileCounter.txt"
    "=== SOURCE CODE PART $fileCounter ===" | Out-File -FilePath $outputFile
    $lineCount = 0
  }

  "" | Out-File -FilePath $outputFile -Append
  "=== FILE: $file ===" | Out-File -FilePath $outputFile -Append
  Get-Content $file | Out-File -FilePath $outputFile -Append
  $newLines = (Get-Content $file | Measure-Object -Line).Lines
  $lineCount += $newLines
  $counter++

  if ($counter % 10 -eq 0) {
    Write-Host "  Processed $counter files..."
  }
}

Write-Host "  ✓ Processed $counter TypeScript files into $fileCounter parts"

# 7. Find all "checkpoint" references
Write-Host "🔍 Finding all 'checkpoint' references..."
Get-ChildItem -Path ".." -Recurse -Include "*.ts","*.tsx","*.json","*.md" |
  Where-Object { $_.FullName -notmatch "node_modules|dist|build" } |
  Select-String -Pattern "checkpoint" -CaseSensitive |
  Out-File -FilePath 07-checkpoint-references.txt

# 8. Find checkpoint definitions
Get-ChildItem -Path ".." -Recurse -Include "*.ts","*.tsx" |
  Where-Object { $_.FullName -notmatch "node_modules" } |
  Select-String -Pattern "checkpoint" -CaseSensitive |
  Where-Object { $_.Line -match "(interface|type|class|const|function|export)" } |
  Out-File -FilePath 08-checkpoint-definitions.txt

Write-Host ""
Write-Host "✅ Analysis complete!"
Write-Host ""
Write-Host "📁 Results saved to: snapback-analysis\"
Write-Host ""
Write-Host "🎯 Next steps:"
Write-Host "   1. Review snapback-analysis\00-SUMMARY.txt"
Write-Host "   2. Share key files with Claude"
Write-Host ""

Set-Location ..
```

Then run:

```powershell
cd C:\path\to\your\snapback-repo
.\analyze-snapback-repo.ps1
```

---

## 📋 What Gets Generated

After running the script, you'll have a `snapback-analysis/` folder with:

### Priority Files (Share These First with Claude):

1. **07-checkpoint-references.txt** ⭐⭐⭐⭐⭐

    - Every mention of "checkpoint" in your code
    - THIS IS THE KEY FILE for renaming

2. **08-checkpoint-definitions.txt** ⭐⭐⭐⭐⭐

    - All checkpoint classes, interfaces, types
    - Critical for surgical renaming

3. **01-structure.txt** ⭐⭐⭐⭐

    - Overall architecture
    - Helps understand organization

4. **03-package-jsons.txt** ⭐⭐⭐
    - Dependencies and scripts
    - Shows what frameworks you're using

### Supporting Files (Share if Needed):

5. **06-source-code-part-\*.txt** ⭐⭐⭐

    - Your actual TypeScript code
    - Split into manageable chunks

6. **09-api-routes.txt** ⭐⭐

    - Backend API structure

7. **10-database-schemas.txt** ⭐⭐

    - Database structure

8. **13-todos-fixmes.txt** ⭐

    - Known issues you've noted

9. **14-detailed-tree.txt** ⭐
    - Complete file tree

---

## 🎯 How to Share with Claude

### Option 1: Share Key Files Only (Recommended)

Start with just these 4 files:

```bash
cd snapback-analysis

# On Mac/Linux:
cat 07-checkpoint-references.txt 08-checkpoint-definitions.txt 01-structure.txt 03-package-jsons.txt > claude-review-part1.txt

# On Windows:
type 07-checkpoint-references.txt 08-checkpoint-definitions.txt 01-structure.txt 03-package-jsons.txt > claude-review-part1.txt
```

Then paste the contents of `claude-review-part1.txt` to Claude.

### Option 2: Share Everything (If Needed)

If Claude asks for more details:

1. Upload files 2-3 at a time (to avoid overwhelming)
2. Start with source-code-part-1.txt
3. Add more parts as Claude requests them

---

## 🔍 Quick Preview (Before Sharing)

Want to see what Claude will see? Check the summaries:

```bash
# See how many checkpoint references exist
wc -l snapback-analysis/07-checkpoint-references.txt

# Preview first 20 checkpoint references
head -20 snapback-analysis/07-checkpoint-references.txt

# See your repository structure
head -50 snapback-analysis/01-structure.txt
```

---

## ⚠️ Troubleshooting

### "Permission denied"

```bash
chmod +x analyze-snapback-repo.sh
```

### "tree: command not found" (Mac)

```bash
brew install tree
```

### "tree: command not found" (Linux)

```bash
sudo apt-get install tree  # Ubuntu/Debian
sudo yum install tree      # CentOS/RHEL
```

### Script runs but creates empty files

-   Make sure you're in the repository root
-   Check that packages/ and apps/ directories exist
-   Verify you have TypeScript files

### PowerShell: "Cannot be loaded because running scripts is disabled"

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🎯 What Happens Next

After you share the files with Claude:

### Round 1: Checkpoint Audit

Claude analyzes all checkpoint references and gives you:

-   Complete rename mapping (checkpoint → snapshot)
-   Regex patterns for automated replacement
-   Manual review items (where automation might miss)

### Round 2: Architecture Analysis

Claude reviews your structure and tells you:

-   ✅ What's good (keep as-is)
-   🔄 What needs updates (specific changes)
-   ❌ What to remove (dead code)
-   ➕ What's missing (new features to add)

### Round 3: Surgical Instructions

Claude provides:

-   File-by-file action items
-   Copy-paste code for new features
-   Testing checklist
-   Implementation timeline

### Round 4: Implementation Plan

Claude creates:

-   Week-by-week roadmap
-   Priority matrix
-   Launch checklist

**Total rounds**: 3-5 iterations  
**Timeline**: 2-3 days of async back-and-forth  
**Result**: Surgical upgrade plan ready to execute

---

## 💡 Pro Tips

1. **Start small**: Share just the priority files first
2. **Be specific**: If Claude asks for more, share exactly what's requested
3. **Ask questions**: If instructions unclear, ask for clarification
4. **Track progress**: Check off files as you update them
5. **Test incrementally**: Don't change everything at once

---

## 🚀 Ready to Begin?

1. ✅ Run the analysis script
2. ✅ Check that files were created in `snapback-analysis/`
3. ✅ Start with `07-checkpoint-references.txt`
4. ✅ Share with Claude
5. ✅ Get surgical instructions
6. ✅ Execute the plan!

**Let's make SnapBack incredible! 🎯**
