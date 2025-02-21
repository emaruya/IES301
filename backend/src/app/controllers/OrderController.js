import { object, string } from 'yup';
import Order from '../models/Order';
import Student from '../models/Student';
import Membership from '../models/Membership';

class OrderController {
  async store(req, res) {
    const schema = object().shape({
      question: string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'validation fails' });
    }

    const { id } = req.params;
    const { question } = req.body;

    const checkStudentExists = await Student.findByPk(id);

    if (!checkStudentExists) {
      return res.status(401).json({ error: 'Aluno não encontrado' });
    }

    const checkStudentHasMembership = await Membership.findOne({
      where: {
        student_id: id,
      },
    });

    if (!checkStudentHasMembership) {
      return res
        .status(401)
        .json({ error: 'Alunos precisam estar matriculados para realizar ordens' });
    }

    if (!checkStudentHasMembership.active) {
      return res
        .status(401)
        .json({ error: 'Matriculas precisam estar ativas para criar ordens' });
    }

    const newOrder = await Order.create({
      student_id: id,
      question,
    });

    const data = {
      id: newOrder.id,
      question: newOrder.question,
      student: {
        id: checkStudentExists.id,
        name: checkStudentExists.name,
      },
    };

    const ownerSocket = req.admin;

    if (ownerSocket) {
      req.io.to('admin').emit('new_order', data);
    }

    return res.json(newOrder);
  }

  async index(req, res) {
    const { page = 1 } = req.query;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        student_id: req.params.id,
      },
      order: [['createdAt', 'DESC']],
      limit: 5,
      offset: (page - 1) * 5,
    });

    return res.json({
      orders,
      count,
    });
  }
}

export default new OrderController();
