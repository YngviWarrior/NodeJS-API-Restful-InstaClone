var express = require('express'),
    bodyParser = require('body-parser'),
    mongoDB = require('mongodb'),
    objectId = require('mongodb').ObjectID, // Para fazer select por object Id.
    multiparty = require('connect-multiparty'),
    fs = require('fs') //FileSystem, para manipular arquivo.

var port = 8080
var app = express()

//body-parser
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(multiparty()) // Aceita multiparty/formdata
app.use(function(req, res, next){ //Preflight XML REQUEST
    
    res.setHeader("Access-Control-Allow-Origin", "http://localhost")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
    //Permite reescrever as propriedades dos headers
    res.setHeader("Access-Control-Allow-Headers", "content-type") 
    res.setHeader("Access-Control-Allow-Credentials", true) 
    
    next()
})

app.listen(port)

//Inicializando o DB
var db = new mongoDB.Db(
        'instagram',
        new mongoDB.Server('localhost', 27017, {}),
        {}
)

console.log('Servidor HTTP escutando na porta' + port)

app.get('/', function(req, res){
    res.send({msg: 'Olá'})
})
//URI + verbo HTTP (RESTFULL) -------------------------------------------------->
app.post('/api', function(req, res){
    //Feito no middlware de configuração do objeto de response.
    // res.setHeader("Access-Control-Allow-Origin", "http://localhost") //Habilita esse dominio. '*' habilita todos.
    
    var date =  new Date()
    var time_stamp = date.getTime()

    var url_imagem = time_stamp +'_'+ req.files.arquivo.originalFilename

    var path_origin = req.files.arquivo.path
    var path_destino = './uploads/' + url_imagem

    fs.rename(path_origin, path_destino, function(err){
        if(err){
            res.status(500).json({error: err})
            return
        }

        var dados = {
            url_imagem: url_imagem,
            titulo: req.body.titulo
        }
    
        db.open(function(err, mongoClient){
            mongoClient.collection('postagens', function(err, collection){
                collection.insert(dados, function(err, records){
                    if(err){
                        res.json({'status': 'erro'})
                    } else {
                        res.json({'status': 'Inclusão feita com sucesso.'})
                    }
                    mongoClient.close()
                })
            })
        })
    })
})

app.get('/api', function(req, res){
    //res.setHeader("Access-Control-Allow-Origin", "http://localhost") //Habilita esse dominio. '*' habilita todos.

    db.open(function(err, mongoClient){
        mongoClient.collection('postagens', function(err, collection){
            collection.find().toArray(function(err, result){
                if(err){
                    res.json(err)
                } else{
                    res.json(result)
                }
                mongoClient.close()
            })
        })
    })
})

//o middleware static resolve essa rota.
app.get("/imagens/:imagem", function(req, res){
    var img = req.params.imagem

    fs.readFile('./uploads/'+img, function(err, content){
        if(err){
            res.status(400).json(err)
            return
        }

        res.writeHead(200, {'content-type': 'image/jpg'}) //Tipo de arquivo a ser entregado no navegador.
        res.end(content) //pega info. e escreve dentro do response.
    })
})

app.get('/api/:id', function(req, res){
    db.open(function(err, mongoClient){
        mongoClient.collection('postagens', function(err, collection){
            collection.find({_id:{$eq : objectId(req.params.id)}}).toArray(function(err, result){
                if(err){
                    res.json(err)
                } else{
                    res.json(result)
                }
                mongoClient.close()
            })
        })
    })
})

app.put('/api/:id', function(req, res){
    db.open(function(err, mongoClient){
        mongoClient.collection('postagens', function(err, collection){
            collection.update(
                { _id: objectId(req.params.id) },//query.
                { $push: {
                            comentarios : {
                                id_comentario: new objectId(), //Gera ID
                                comentario: req.body.comentario
                            }
                         }
                    
                },//instrução de atualizacao.
                {},//multi, um ou todos registros.
                function(err, result){//callback.
                    if(err){
                        res.json(err)
                    } else {
                        res.json(result)
                    }
            })
            mongoClient.close()
        })
    })
})

app.delete('/api/:id', function(req, res){
    db.open(function(err, mongoClient){
        mongoClient.collection('postagens', function(err, collection){
            collection.update(
                { },
                    { $pull: {
                        comentarios: { id_comentario: objectId(req.params.id)}
                    }
                },
                {mult: true},
                function(err, result){
                    if(err){
                        res.json(err)
                    } else {
                        res.json(result)
                    }
                }
            )
            mongoClient.close()
        })
    })
})