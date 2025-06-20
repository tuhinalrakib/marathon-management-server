const jwt = require("jsonwebtoken")

const verifyJWT = (req, res, next) => {
    // const token = req?.headers?.cookie.slice(6) // same way to get token
    const token = req?.cookies?.token
    if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" })
    }

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, deocoded) => {
        if (err) {
            console.log(err)
            return res.status(403).send({ message: "Unauthorized Access" })
        }
        req.tokenEmail = deocoded.email
        next()
    })

}

module.exports = { verifyJWT }
