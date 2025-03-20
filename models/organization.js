const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    name: String,
    contact: String,
    position: String
});

const teamSchema = new mongoose.Schema({
    teamId: String,
    members: [memberSchema]
});

const organizationSchema = new mongoose.Schema({
    teamData: [teamSchema],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
