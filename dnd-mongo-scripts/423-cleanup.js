[
    {
      '$match': {
        'approvalStatus': true
      }
    }, {
      '$group': {
        '_id': '$id',
        'count': {
          '$sum': 1
        }
      }
    }, {
      '$match': {
        'count': {
          '$gt': 1
        }
      }
    }
  ]
db.characters.deleteOne({'id': '40573657'});
db.characters.deleteOne({'id': '41008957'});
db.characters.deleteOne({'id': '1708179'});
db.characters.deleteOne({'id': '48035109'});
