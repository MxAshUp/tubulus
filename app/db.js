const mongoose = require('mongoose');
const EventEmitter = require('events');
const crypto = require('crypto');

function computeHash(data) {
    return crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');
}

function addHashToSchema(schema) {

    schema.add({
        hash: String
    });

    // Add's a hash
    schema.pre('save', function(next) {
        // Extracting fields that we want to hash
        const dataToHash = {
            type: this.type,
            meta: this.meta,
            data: this.data
        };
    
        // Computing hash and updating the 'hash' field
        this.hash = computeHash(dataToHash);
    
        next();
    });

    return schema;

}

function eventifySchema(schema) {
    const events = new EventEmitter();
    schema.pre('save', function() {
        // Mongoose will set `isNew` to `false` if `save()` succeeds
        this.$locals.wasNew = this.isNew;
    });

    schema.post('save', function(doc) {
        const eventName = this.$locals.wasNew ? 'insert' : 'update';
        events.emit(eventName, doc);
    });

    return events;
}

module.exports.setup = function setup(options = {}) {
    const {
        mongoUrl = 'mongodb://localhost:27017/dance-pdx',
    } = options;

    // Connect to MongoDB
    mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    
    // Define the Resource schema
    const resourceSchema = new mongoose.Schema({
        type: String,
        meta: Object,
        data: mongoose.Schema.Types.Mixed,
    
        handled: {
            type: Boolean,
            default: false
        },
        // Maybe not necessary feature?
        orphaned: {
            type: Boolean,
            default: false
        },
        depth: {
            type: Number,
            default: 0,
        },
        parentResource: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Resource' // Reference to the same collection
        },
    }, {
        timestamps : true
    });

    addHashToSchema(resourceSchema);

    const resourceEvents = eventifySchema(resourceSchema);

    const Resource = mongoose.model('Resource', resourceSchema);

    return {
        Resource,
        resourceEvents
    }
}