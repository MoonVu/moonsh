const mongoose = require('mongoose');

const SubGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  telegramId: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: '' }
});

const TelegramGroupSchema = new mongoose.Schema({
  type: { type: String, enum: ['SHBET', 'THIRD_PARTY'], required: true, unique: true },
  subGroups: { type: [SubGroupSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'telegram_groups'
});

TelegramGroupSchema.statics.ensureParents = async function() {
  const types = ['SHBET', 'THIRD_PARTY'];
  for (const t of types) {
    const exists = await this.findOne({ type: t });
    if (!exists) {
      await this.create({ type: t, subGroups: [] });
    }
  }
};

module.exports = mongoose.model('TelegramGroup', TelegramGroupSchema);


