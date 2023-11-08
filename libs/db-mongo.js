const mongoose = require('mongoose');
const { addHashToSchema, requiredNonEmptyStringType } = require('./mongo-utilities');
const { throwIfMissing } = require('./utilities');

// Define the Resource schema
const resourceSchema = new mongoose.Schema({
    type: requiredNonEmptyStringType,
    meta: Object,
    data: mongoose.Schema.Types.Mixed,

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
        }
    },
    statics: {
        findCached: async function(parentHandler, parentResource) {
            const parentResourceId = parentResource.id;
            const parentHandlerHash = parentHandler.hash;
            // Maybe the result of this handler already has cached resources
            const cachedResources = await Resource.find({parentResource: parentResourceId, parentHandlerHash: parentHandlerHash});
            return cachedResources.map((res) => {
                res.$locals.fromCache = true;
                res.$locals.handlerId = parentHandler.id;
                return res;
            });
        },
        create: function(newResourceData, parentHandler, parentResource) {
            const resObj = {
                ...newResourceData,
            };
            if(parentHandler) {
                resObj.parentHandlerHash = parentHandler.hash;
            }
            if(parentResource) {
                resObj.parentResource = parentResource._id;
                resObj.depth = parentResource.depth + 1;
            }
            const resource = new Resource(resObj);

            if(parentHandler) {
                resource.$locals.handlerId = parentHandler.id;
            }

            return resource;
        }
    }
});

addHashToSchema(resourceSchema, ['type', 'meta', 'data']);

const Resource = mongoose.model('Resource', resourceSchema);

module.exports.findResources = Resource.find.bind(Resource);
module.exports.countResources = Resource.count.bind(Resource);
module.exports.createResource = Resource.create.bind(Resource);
module.exports.findResourcesCached = Resource.findCached.bind(Resource);

module.exports.setup = async function setup(options = {}) {
    const {
        mongoUrl = throwIfMissing`mongoUrl`,
    } = options;

    // Connect to MongoDB
    await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}