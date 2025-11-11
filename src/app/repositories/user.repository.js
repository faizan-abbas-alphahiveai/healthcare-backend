
const userModel = require("../../models/user.model.js");
class UserRepository {

    async createUser(userData) {

        const user = new userModel(userData);
        return await user.save();

    }

    async findUserByEmail(email) {

        return await userModel.findOne({ email });

    }



    async findUserById(id) {
        return await userModel.findById(id);
    }

    async updateUser(id, updateData) {

        return await userModel.findByIdAndUpdate(id, updateData, { new: true });

    }

    async updateStatus(userId, status) {
    return await userModel.findByIdAndUpdate(
        userId,
        { isVerified: status },
        { new: true }
    );
}




    async getAllUsers() {

        return await userModel.find({}).select('-password');

    }

    // Password update method for reset functionality
    async updatePassword(email, hashedPassword) {
        return await userModel.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );
    }

}

module.exports = new UserRepository();
