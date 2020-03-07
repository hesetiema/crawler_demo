const mongoose = require('mongoose');

const jobsSchema = new mongoose.Schema({
    url: String,
    name: String,
    position: String,
    salary: String,
    date: Date
});

module.exports = mongoose.model('Jobs', jobsSchema);