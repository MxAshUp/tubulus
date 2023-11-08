const mongoose = require('mongoose');
const EventEmitter = require('events');
const { defer, from } = require('rxjs');
const { mergeAll } = require('rxjs/operators');
const { hashString } = require('./utilities');

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
        this.hash = hashString('md5', dataToHash);
    
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

const requiredNonEmptyStringType = {
    type: String,
    required: true,
    validate: {
        validator: Boolean,
    }
};

module.exports.setup = async function setup(options = {}) {
    const {
        mongoUrl = 'mongodb://localhost:27017/dance-pdx',
    } = options;

    // Connect to MongoDB
    await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    
    // Define the Resource schema
    const resourceSchema = new mongoose.Schema({
        type: requiredNonEmptyStringType,
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
        parentHandlerHash: String,
        parentResource: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Resource' // Reference to the same collection
        },
    }, {
        timestamps : true,
        methods: {
            isFromCache: function() {
                return !!this.$locals?.fromCache;
            },
            setHandled: async function(handlers) {
                // Update the resource's status
                if(!handlers.length) {
                    this.orphaned = true;
                } else {
                    this.handled = true;
                }

                await this.save();
            }
        },
        statics: {
            getHandledCache: async function(parentHandler, parentResource) {
                const parentResourceId = parentResource.id;
                const parentHandlerHash = parentHandler.hash;
                // Maybe the result of this handler already has cached resources
                const cachedResources = await Resource.find({parentResource: parentResourceId, parentHandlerHash: parentHandlerHash});
                return cachedResources.map((res) => {
                    res.$locals.fromCache = true;
                    res.handled = false;
                    res.orphaned = false;
                    res.$locals.handlerId = parentHandler.id;
                    return res;
                });
            },
            create: function(newResourceData, parentHandler, parentResource) {
                const resource = new Resource({
                    ...newResourceData,
                    parentHandlerHash: parentHandler.hash,
                    parentResource: parentResource._id,
                    depth: parentResource.depth + 1,
                });

                resource.$locals.handlerId = parentHandler.id;

                return resource;
            }
        }
    });

    addHashToSchema(resourceSchema);

    const resourceEvents = eventifySchema(resourceSchema);

    const Resource = mongoose.model('Resource', resourceSchema);

    const fromResourceFind = (query) => defer(() => from(Resource.find(query))).pipe(
        mergeAll(),
    );

    return {
        Resource,
        resourceEvents,
        fromResourceFind
    }
}