const { hashString } = require('./utilities');
const EventEmitter = require('events');

module.exports.requiredNonEmptyStringType = {
    type: String,
    required: true,
    validate: {
        validator: Boolean,
    }
};

module.exports.addHashToSchema = (schema, properties) => {

    schema.add({
        hash: String
    });

    // Add's a hash
    schema.pre('save', function(next) {
        // Extracting fields that we want to hash
        const dataToHash = {};
        
        for (const key in properties) {
            dataToHash[key] = this[key];
        }
    
        // Computing hash and updating the 'hash' field
        this.hash = hashString('md5', dataToHash);
    
        next();
    });

    return schema;

}

// Unused currently
module.exports.eventifySchema = function(schema) {
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