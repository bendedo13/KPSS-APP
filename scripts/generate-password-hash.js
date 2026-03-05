#!/usr/bin/env node

/**
 * Admin Panel - Password Hash Generator
 * bcrypt ile hash'lenmiş şifre oluşturmak için
 * 
 * Kullanım:
 * node scripts/generate-password-hash.js "senin-sifren"
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('❌ HATA: Şifre belirtilmedi!\n');
  console.log('Kullanım: node scripts/generate-password-hash.js "senin-sifren"\n');
  console.log('Örnek: node scripts/generate-password-hash.js "Benalan.1"\n');
  process.exit(1);
}

if (password.length < 8) {
  console.log('❌ HATA: Şifre en az 8 karakter olmalıdır!\n');
  process.exit(1);
}

console.log('⏳ Hash'leniyor...\n');

const hash = bcrypt.hashSync(password, 10);

console.log('✅ Hash Başarıyla Oluşturuldu!\n');
console.log('Şifre:', password);
console.log('Hash:', hash);
console.log('\n📋 Bu hash'i migrations/009_admin_seed_data.sql dosyasında password_hash yerine kopyala\n');

// Doğrulama testi yap
const isValid = bcrypt.compareSync(password, hash);
console.log('🔐 Doğrulama Testi:', isValid ? '✅ BAŞARILI' : '❌ BAŞARISIZ\n');
