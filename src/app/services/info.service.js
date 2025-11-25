const infoRepository = require('../repositories/info.repository.js');
const AppError = require('../../utils/AppError.util.js');
const { API_STATUS_CODES } = require('../../constants/apiStatus.js');

class InfoService {
  async createInfo(data) {
    // Basic validation
    const { name, phone, address, type } = data;
    if (!name || !phone || !address || !type) {
      throw new AppError('Missing required fields', API_STATUS_CODES.BAD_REQUEST);
    }

    // Ensure userId is present (set by controller from auth middleware)
    if (!data.userId) {
      throw new AppError('userId is required', API_STATUS_CODES.UNAUTHORIZED);
    }

    // If type is doctor, ensure doctorType is provided
    if (type === 'doctor') {
      if (!data.doctorType) {
        throw new AppError('doctorType is required for type doctor', API_STATUS_CODES.BAD_REQUEST);
      }
      // If specialist, speciality is required
      if (data.doctorType === 'specialist' && !data.speciality) {
        throw new AppError('speciality is required for specialist doctors', API_STATUS_CODES.BAD_REQUEST);
      }
    }
    // Enforce uniqueness per insurance card slot (insuranceCard1 / insuranceCard2)
    if (type === 'insuranceCard') {
      const existingCount = await infoRepository.count({
        userId: data.userId,
        type: type,
      });
      if (existingCount >= 2) {
        throw new    AppError(`You already have 2 entries for insurance cards`, API_STATUS_CODES.BAD_REQUEST);
      }
    }

    // create and return
    const created = await infoRepository.createInfo(data);
    return created;
  }

  async getInfoById(id) {
    const info = await infoRepository.findById(id);
    if (!info) {
      throw new AppError('Info item not found', API_STATUS_CODES.NOT_FOUND);
    }
    return info;
  }

  async updateInfo(id, updateData) {
    const info = await infoRepository.findById(id);
    if (!info) {
      throw new AppError('Info item not found', API_STATUS_CODES.NOT_FOUND);
    }
    // If updating type/doctorType/speciality, validate consistency
    const newType = updateData.type || info.type;
    const newDoctorType = updateData.doctorType || info.doctorType;
    const newSpeciality = updateData.speciality || info.speciality;

    if (newType === 'doctor') {
      if (!newDoctorType) {
        throw new AppError('doctorType is required for type doctor', API_STATUS_CODES.BAD_REQUEST);
      }
      if (newDoctorType === 'specialist' && !newSpeciality) {
        throw new AppError('speciality is required for specialist doctors', API_STATUS_CODES.BAD_REQUEST);
      }
    }
    // Enforce uniqueness per insurance card slot on update
    if (newType === 'insuranceCard1' || newType === 'insuranceCard2') {
      const existingCount = await infoRepository.count({
        userId: info.userId,
        type: newType,
        _id: { $ne: id }, // exclude current document
      });
      if (existingCount >= 1) {
        throw new AppError(`You already have an entry for ${newType}`, API_STATUS_CODES.BAD_REQUEST);
      }
    }

    const updated = await infoRepository.updateById(id, updateData);
    return updated;
  }

  async deleteInfo(id) {
    const info = await infoRepository.findById(id);
    if (!info) {
      throw new AppError('Info item not found', API_STATUS_CODES.NOT_FOUND);
    }
    await infoRepository.deleteById(id);
    return;
  }

  async listInfos(type) {
    const filter = {};
    if (type) {
      filter.type = type;
    }
    return await infoRepository.findAll(filter);
  }
}

module.exports = new InfoService();
