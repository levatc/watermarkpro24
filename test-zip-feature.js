#!/usr/bin/env node

/**
 * Test-Script für das ZIP-Upload Feature
 * 
 * Dieses Script testet die ZIP-Verarbeitung durch:
 * 1. Erstellen einer Test-ZIP-Datei mit verschiedenen Dateitypen
 * 2. Upload zur API
 * 3. Überprüfung der Verarbeitungsergebnisse
 */

const fs = require('fs')
const path = require('path')
const FormData = require('form-data')

async function createTestZip() {
  console.log('📦 Erstelle Test-ZIP-Datei...')
  
  // Für diesen Test nehmen wir an, dass bereits eine test.zip Datei existiert
  // In einer echten Implementierung würden wir hier eine ZIP-Datei erstellen
  const testZipPath = path.join(__dirname, 'test.zip')
  
  if (!fs.existsSync(testZipPath)) {
    console.log('❌ Test-ZIP-Datei nicht gefunden. Bitte erstellen Sie eine test.zip mit Bildern, Videos und PDFs.')
    process.exit(1)
  }
  
  return testZipPath
}

async function testZipUpload(zipPath) {
  console.log('🚀 Teste ZIP-Upload...')
  
  const formData = new FormData()
  
  // ZIP-Datei hinzufügen
  formData.append('zip', fs.createReadStream(zipPath))
  
  // Wasserzeichen-Einstellungen hinzufügen
  const watermarkSettings = {
    type: 'text',
    text: '© 2024 Test Watermark',
    fontSize: 24,
    color: '#ffffff',
    position: 'bottom-right',
    opacity: 0.8
  }
  
  formData.append('watermark', JSON.stringify(watermarkSettings))
  
  try {
    const fetch = (await import('node-fetch')).default
    
    console.log('📤 Sende Request an API...')
    const response = await fetch('http://localhost:8000/api/process-zip', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    
    console.log('✅ ZIP-Verarbeitung erfolgreich!')
    console.log('📊 Ergebnisse:')
    console.log(`   - Gesamte Dateien: ${result.data.totalFiles}`)
    console.log(`   - Verarbeitete Dateien: ${result.data.processedFiles.length}`)
    console.log(`   - Übersprungene Dateien: ${result.data.skippedFiles.length}`)
    console.log(`   - Verarbeitungszeit: ${result.data.processingTime}s`)
    
    if (result.data.processedFiles.length > 0) {
      console.log('\n📋 Verarbeitete Dateien:')
      result.data.processedFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.originalName} (${file.fileType}) - ${file.processingTime}s`)
        console.log(`      Download: http://localhost:8000${file.processedUrl}`)
      })
    }
    
    if (result.data.skippedFiles.length > 0) {
      console.log('\n⚠️ Übersprungene Dateien:')
      result.data.skippedFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`)
      })
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Fehler beim ZIP-Upload:', error.message)
    throw error
  }
}

async function main() {
  console.log('🧪 ZIP-Feature Test gestartet')
  console.log('=' .repeat(50))
  
  try {
    // Test-ZIP erstellen/finden
    const zipPath = await createTestZip()
    console.log(`✅ Test-ZIP gefunden: ${zipPath}`)
    
    // ZIP-Upload testen
    const result = await testZipUpload(zipPath)
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ Test erfolgreich abgeschlossen!')
    
  } catch (error) {
    console.error('\n' + '=' .repeat(50))
    console.error('❌ Test fehlgeschlagen:', error.message)
    process.exit(1)
  }
}

// Script ausführen, wenn direkt aufgerufen
if (require.main === module) {
  main()
}

module.exports = { testZipUpload, createTestZip }