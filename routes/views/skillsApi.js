var keystone = require('keystone'),
    Skill = keystone.list('Skill');

exports = module.exports = function(req, res) {

  var view = new keystone.View(req, res);

  view.on('init', function(next) {
    Skill.model.find().exec(function(err, results) {
        if (err || !results.length) return next(err);
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(results));
        next(err);
    });
  });

  view.render(function(){
    res.end();
  });
}