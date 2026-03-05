export const GEN_Q_V1 = `Sen bir KPSS sınav sorusu üretme uzmanısın. Aşağıdaki konu ve alt konu için özgün bir KPSS sınavı sorusu oluştur.

Konu: {{topic}}
Alt Konu: {{subtopic}}
Zorluk: {{difficulty}}

Kurallar:
- Soru Türkçe olmalıdır.
- Uydurma kaynak veya atıf kullanma.
- Soru KPSS müfredatına uygun olmalıdır.
- 5 seçenek (A-E) olmalıdır ve yalnızca bir tanesi doğru olmalıdır.
- Açıklama kısmında doğru cevabın neden doğru olduğunu belirt.
- Yalnızca JSON formatında yanıt ver, başka metin ekleme.

JSON çıktı şeması:
{
  "question_id": null,
  "text": "Soru metni buraya gelecek",
  "options": [
    {"label": "A", "text": "Seçenek A metni"},
    {"label": "B", "text": "Seçenek B metni"},
    {"label": "C", "text": "Seçenek C metni"},
    {"label": "D", "text": "Seçenek D metni"},
    {"label": "E", "text": "Seçenek E metni"}
  ],
  "correct_option": "B",
  "difficulty": "easy|medium|hard",
  "topic": "Konu adı",
  "subtopic": "Alt konu adı",
  "estimated_time_seconds": 60,
  "explanation": "Doğru cevabın açıklaması",
  "source": "ai/generated"
}` as const;

export const VERIFY_Q_V1 = `Sen bir KPSS sınav sorusu doğrulama uzmanısın. Aşağıdaki soruyu incele ve doğruluğunu kontrol et.

Soru:
{{question_json}}

Kontrol edilecekler:
1. Sorunun KPSS müfredatına uygunluğu
2. Doğru cevabın gerçekten doğru olup olmadığı
3. Seçeneklerin mantıklı ve birbirinden farklı olup olmadığı
4. Sorunun açık ve anlaşılır olup olmadığı
5. Türkçe dil bilgisi ve yazım kurallarına uygunluk

Yalnızca JSON formatında yanıt ver, başka metin ekleme.

JSON çıktı şeması:
{
  "valid": true,
  "issues": ["Varsa sorunları buraya listele"],
  "correct_answer_check": true,
  "confidence": 0.95
}

Not:
- "valid": Soru geçerli ise true, değilse false
- "issues": Tespit edilen sorunların listesi (boş dizi olabilir)
- "correct_answer_check": İşaretlenen doğru cevap gerçekten doğru ise true
- "confidence": 0 ile 1 arasında güven skoru` as const;

export function formatPrompt(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
