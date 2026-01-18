const jwt = require('jsonwebtoken');

class Util {

    constructor() {

    }
    verifyToken(req, res, next) {
        console.log("verify token");
    
        let token = req.headers?.authorization?.split(" ")[1];
    
        console.log("token");
        console.log(token);
        
        // Verifica se o token existe
        if (!token) {
          return res.status(401).json({ msg: "Acesso não autorizado",att:"" });
        }
        
        // Verifica se o token é válido
        jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
          if (err) {
            return res.status(401).json({ message: "Acesso não autorizado" });
          }
      
          // Define o usuário autenticado no objeto de requisição para uso posterior
          req.body.user = decoded;
          console.log("decoded");
          console.log(decoded);
          next();
        });
      }    
}

module.exports = new Util()