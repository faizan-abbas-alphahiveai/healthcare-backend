const InfoModel = require('../../models/info.model.js');

class InfoRepository {
  async createInfo(data) {
    const info = new InfoModel(data);
    return await info.save();
  }

  async findById(id) {
    return await InfoModel.findById(id);
  }

  async updateById(id, updateData) {
    return await InfoModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id) {
    return await InfoModel.findByIdAndDelete(id);
  }

  async findAll(filter = {}) {
    return await InfoModel.find(filter);
  }

  async count(filter = {}) {
    return await InfoModel.countDocuments(filter);
  }
}

module.exports = new InfoRepository();
