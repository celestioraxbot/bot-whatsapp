module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  chromePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',

  // API Keys
  openAiApiKey: process.env.OPENAI_API_KEY,
  huggingFaceApiToken: process.env.HUGGINGFACE_API_TOKEN,
  fbAdsApiUrl: process.env.FB_ADS_API_URL,
  deepGramApiKey: process.env.DEEPGRAM_API_KEY,
  deepAiApiKey: process.env.DEEPAI_API_KEY,
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,

  // Checkout Links
  checkoutLinks: {
    cerebroAltaPerformance: process.env.CHECKOUT_CEREBRO_ALTA_PERFORMANCE,
    corpoMente: process.env.CHECKOUT_CORPO_MENTE,
    saudeAmanha: process.env.CHECKOUT_SAUDE_AMANHA,
    saudeImersiva: process.env.CHECKOUT_SAUDE_IMERSIVA,
    alongamentos: process.env.CHECKOUT_15_ALONGAMENTOS,
    sonoProfundo: process.env.CHECKOUT_SONO_PROFUNDO,
    nervoCure: process.env.CHECKOUT_NERVOCURE,
    queda100: process.env.CHECKOUT_100QUEDA,
    dorControle: process.env.CHECKOUT_DOR_CONTROLE,
    rosaXantina: process.env.CHECKOUT_ROSA_XANTINA,
    hemoGotas: process.env.CHECKOUT_HEMOGOTAS
  }
};