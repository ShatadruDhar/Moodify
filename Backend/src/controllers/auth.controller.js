const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto")
const redis = require("../config/cache")
const { getRevocationKey } = require("../utils/token-revocation")

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
}

async function registerUser(req, res) {
    const { username, email, password } = req.body;

    const isAlreadyRegistered = await userModel.findOne({
        $or: [
            { email },
            { username }
        ]
    })

    if (isAlreadyRegistered) {
        return res.status(400).json({
            message: "User with the same email or username already exists"
        })
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        username,
        email,
        password: hash
    })

    const token = jwt.sign(
        {
            id: user._id,
            username: user.username
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "3d",
            jwtid: randomUUID()
        }
    )

    res.cookie("token", token, cookieOptions)

    return res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}

async function loginUser(req, res) {
    const { email, password, username } = req.body;

    const user = await userModel.findOne({
        $or: [
            { email },
            { username }
        ]
    }).select("+password")

    if (!user) {
        return res.status(400).json({
            message: "Invalid credentials"
        })
    }


    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid credentials"
        })
    }

    const token = jwt.sign(
        {
            id: user._id,
            username: user.username
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "3d",
            jwtid: randomUUID()
        }
    )

    res.cookie("token", token, cookieOptions)

    return res.status(200).json({
        message: "User logged in successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

async function getMe(req, res) {
    const user = await userModel.findById(req.user.id)

    res.status(200).json({
        message: "User fetched successfully",
        user
    })
}

async function logoutUser(req, res) {

    const token = req.cookies.token
    const remainingLifetimeSeconds = Math.max(0, req.user.exp - Math.floor(Date.now() / 1000))
    if (remainingLifetimeSeconds > 0) {
        await redis.set(getRevocationKey(token, req.user), "1", "EX", remainingLifetimeSeconds)
    }
    res.clearCookie("token", cookieOptions)

    res.status(200).json({
        message: "logout successfully."
    })
}


module.exports = { registerUser, loginUser, getMe, logoutUser }