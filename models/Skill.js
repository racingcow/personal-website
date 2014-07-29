var keystone = require('keystone'),
    Types = keystone.Field.Types;

var Skill = new keystone.List('Skill');

Skill.add({
    name: { type: String, required: true, index: true },
    level: { type: Types.Select, options: 'beginner, intermediate, advanced, expert' },
    image: { type: Types.CloudinaryImage, required: false },
    url: { type: Types.Url, required: false },
    desc: { type: String, required: false, type: Types.Html, wysiwig: true, height:200 }
});

Skill.defaultColumns = 'name, level, desc|60%';
Skill.register();