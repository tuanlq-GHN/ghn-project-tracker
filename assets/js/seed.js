/* Dữ liệu khởi tạo – dự án Nhận bàn giao mặt bằng Kho (20/11).
   Hạn chót có ghi "(đề xuất)" là gợi ý, cần xác nhận lại. */
window.GHN_SEED = function () {
  let n = 0;
  const id = (p) => p + '-' + (++n).toString(36) + Math.random().toString(36).slice(2, 6);
  const now = new Date().toISOString();

  const task = (group, title, o = {}) => ({
    id: id('t'), group, title,
    pic: o.pic || '', start: o.start || '', due: o.due || '',
    status: o.status || 'todo', priority: o.priority || 'medium',
    note: o.note || '', createdAt: now,
  });

  const G1 = 'Bàn giao mặt bằng';
  const G2 = 'Cổng ra/vào 2 & 3';
  const G3 = 'Làm việc với nhà thầu';
  const G4 = 'Lắp đặt Tele';
  const G5 = 'Đào tạo';
  const G6 = 'Nhân sự / PIC';

  const zones = Array.from({ length: 12 }, (_, i) => ({
    id: id('z'), name: 'Zone ' + (i + 1), status: 'none', date: '', team: '', note: '',
  }));

  return {
    version: 1,
    projects: [{
      id: id('p'),
      name: 'Nhận bàn giao mặt bằng Kho',
      code: 'KHO-2026-11',
      location: '',
      manager: '',
      startDate: '2026-11-20',
      endDate: '2027-01-08',
      status: 'active',
      description: 'Nhận bàn giao mặt bằng ngày 20/11. Chỉ sử dụng cổng ra/vào số 2 & 3 cho xe. Lắp đặt Tele cho Kho từ 18/12 (thi công 2 tuần), chia 12 zone – zone nào đã lắp Tele thì không cho phép nhà thầu vào. Tập huấn xe nâng điện và quy trình sử dụng PDA.',
      createdAt: now,
      milestones: [
        { id: id('m'), title: 'Nhận bàn giao mặt bằng', date: '2026-11-20', done: false },
        { id: id('m'), title: 'Bắt đầu lắp đặt Tele cho Kho', date: '2026-12-18', done: false },
        { id: id('m'), title: 'Hoàn thành lắp đặt Tele (2 tuần)', date: '2026-12-31', done: false },
      ],
      tasks: [
        task(G1, 'Nhận bàn giao mặt bằng – ký biên bản bàn giao', { due: '2026-11-20', priority: 'high' }),
        task(G1, 'Khảo sát hiện trạng mặt bằng, chụp ảnh lưu hồ sơ', { start: '2026-11-20', due: '2026-11-21', note: 'Hạn đề xuất – cần xác nhận' }),

        task(G2, 'Xác nhận phương án chỉ sử dụng cổng 2 & 3 cho xe ra/vào', { due: '2026-11-18', priority: 'high', note: 'Thống nhất bằng văn bản với bên cho thuê / BQL. Hạn đề xuất' }),
        task(G2, 'Làm rõ: để sử dụng cổng 2 & 3 thì cần làm gì', { due: '2026-11-19', priority: 'high', note: 'Thủ tục, giấy phép, bảo vệ, barrier, chiếu sáng, biển báo, mặt đường. Hạn đề xuất' }),
        task(G2, 'Lập kế hoạch xe ra/vào (luồng xe, khung giờ, bãi chờ)', { start: '2026-11-19', due: '2026-11-25', priority: 'high', note: 'Hạn đề xuất' }),
        task(G2, 'Kiểm tra mặt bên cạnh Kho có bị vướng xe ra vào không', { due: '2026-11-20', priority: 'high', note: 'Kiểm tra khi nhận bàn giao' }),
        task(G2, 'Biển báo, vạch phân luồng tại cổng 2 & 3', { start: '2026-11-25', due: '2026-11-30', note: 'Hạn đề xuất' }),

        task(G3, 'Hỏi nhà thầu: cổng số 2 hiện 16m có mở rộng lên 20m được không', { due: '2026-11-18', priority: 'high' }),
        task(G3, 'Check nhà thầu: vòng ngoài xung quanh Kho đổ đá được đến đâu', { due: '2026-11-18', priority: 'high' }),
        task(G3, 'Thống nhất lịch nhà thầu rút khỏi từng zone sau khi lắp Tele', { due: '2026-12-15', note: 'Hạn đề xuất' }),

        task(G4, 'Vẽ layout 12 zone của Kho', { start: '2026-11-20', due: '2026-12-05', priority: 'high', note: 'Hạn đề xuất' }),
        task(G4, 'Ban hành quy định: zone đã lắp Tele cấm nhà thầu vào', { due: '2026-12-15', priority: 'high', note: 'Hạn đề xuất' }),
        task(G4, 'Lắp đặt Tele cho Kho (thi công 2 tuần)', { start: '2026-12-18', due: '2026-12-31', priority: 'high' }),
        task(G4, 'Nghiệm thu Tele theo từng zone', { start: '2026-12-28', due: '2027-01-05', note: 'Hạn đề xuất' }),

        task(G5, 'Chốt ngày tập huấn xe nâng điện', { due: '2026-12-05', priority: 'high', note: 'Đối tượng: các bạn lái xe nâng cứng tay. Hạn đề xuất' }),
        task(G5, 'Chốt số tiếng học lái xe nâng điện', { due: '2026-12-05', note: 'Hạn đề xuất' }),
        task(G5, 'Lập danh sách học viên lái xe nâng cứng tay', { due: '2026-12-01', note: 'Hạn đề xuất' }),
        task(G5, 'Chốt ngày & số tiếng đào tạo quy trình sử dụng PDA', { due: '2026-12-05', note: 'Hạn đề xuất' }),

        task(G6, 'Điền PIC cụ thể cho từng đầu việc', { due: '2026-11-15', priority: 'high', note: 'Thêm người ở tab "Nhân sự & PIC", sau đó gán vào từng việc' }),
      ],
      zones,
      gates: [
        { id: id('g'), name: 'Cổng 1', inUse: false, width: '', note: 'Không sử dụng cho xe ra/vào' },
        { id: id('g'), name: 'Cổng 2', inUse: true, width: '16m', note: 'Đang hỏi nhà thầu mở rộng lên 20m' },
        { id: id('g'), name: 'Cổng 3', inUse: true, width: '', note: '' },
      ],
      trainings: [
        { id: id('tr'), topic: 'Tập huấn lái xe nâng điện', audience: 'Các bạn lái xe nâng cứng tay', start: '', end: '', hours: '', trainees: '', trainer: '', location: '', status: 'plan', note: 'Cần chốt: cụ thể những ngày nào, số tiếng học lái' },
        { id: id('tr'), topic: 'Đào tạo quy trình sử dụng PDA', audience: '', start: '', end: '', hours: '', trainees: '', trainer: '', location: '', status: 'plan', note: 'Làm tương tự xe nâng: chốt ngày, số tiếng' },
      ],
      contractor: [
        { id: id('c'), question: 'Cổng số 2 hiện đang 16m thì có mở rộng lên 20m được không?', answer: '', owner: '', due: '2026-11-18', status: 'open' },
        { id: id('c'), question: 'Vòng ngoài xung quanh Kho đổ đá được đến đâu?', answer: '', owner: '', due: '2026-11-18', status: 'open' },
        { id: id('c'), question: 'Mặt bên cạnh Kho có bị vướng xe ra vào không?', answer: '', owner: '', due: '2026-11-20', status: 'open' },
        { id: id('c'), question: 'Xác nhận lịch rút nhân sự nhà thầu khỏi các zone đã lắp Tele', answer: '', owner: '', due: '2026-12-15', status: 'open' },
      ],
      people: [],
      log: [{ at: now, text: 'Khởi tạo dự án' }],
    }],
  };
};
