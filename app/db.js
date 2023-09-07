const mongoose = require('mongoose');
const EventEmitter = require('events');

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

    const resourceEvents = new EventEmitter();
    resourceSchema.pre('save', function() {
        // Mongoose will set `isNew` to `false` if `save()` succeeds
        this.$locals.wasNew = this.isNew;
    });
    resourceSchema.post('save', function(doc) {
        const eventName = this.$locals.wasNew ? 'insert' : 'update';
        resourceEvents.emit(eventName, doc);
    });

    const Resource = mongoose.model('Resource', resourceSchema);

    return {
        Resource,
        resourceEvents
    }
}