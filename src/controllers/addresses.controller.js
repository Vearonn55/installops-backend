import db from '../models/index.js';
const { Op } = db.Sequelize;

const toInt = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const bad   = (res, msg, code = 400) => res.status(code).json({ error: 'bad_request', message: msg });
const is2   = s => typeof s === 'string' && s.length === 2;
const isNum = v => v === null || v === undefined || Number.isFinite(Number(v));

export async function list(req, res, next) {
  try {
    const limit  = toInt(req.query.limit, 20);
    const offset = toInt(req.query.offset, 0);
    const { city, region, country } = req.query || {};

    const where = {};
    if (city)    where.city    = { [Op.iLike]: `%${city}%` };
    if (region)  where.region  = { [Op.iLike]: `%${region}%` };
    if (country) where.country = { [Op.iLike]: `%${country}%` };

    const rows = await db.Address.findAll({ where, order: [['created_at', 'DESC']], limit, offset });
    res.json({ data: rows, limit, offset });
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const row = await db.Address.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Address not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const { line1, line2, city, region, postal_code, country, lat, lng } = req.body || {};
    if (!line1) return bad(res, 'line1 is required');
    if (country && !is2(country)) return bad(res, 'country must be 2-letter ISO code');
    if (!isNum(lat) || !isNum(lng)) return bad(res, 'lat/lng must be numbers');

    const row = await db.Address.create({
      line1,
      line2: line2 || null,
      city: city || null,
      region: region || null,
      postal_code: postal_code || null,
      country: country ? country.toUpperCase() : null,
      lat: lat ?? null,
      lng: lng ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const row = await db.Address.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Address not found' });

    const { line1, line2, city, region, postal_code, country, lat, lng } = req.body || {};
    if (country !== undefined && country !== null && !is2(country)) return bad(res, 'country must be 2-letter ISO code');
    if ((lat !== undefined && !isNum(lat)) || (lng !== undefined && !isNum(lng))) return bad(res, 'lat/lng must be numbers');

    if (line1 !== undefined) row.line1 = line1;
    if (line2 !== undefined) row.line2 = line2 ?? null;
    if (city !== undefined) row.city = city ?? null;
    if (region !== undefined) row.region = region ?? null;
    if (postal_code !== undefined) row.postal_code = postal_code ?? null;
    if (country !== undefined) row.country = country ? country.toUpperCase() : null;
    if (lat !== undefined) row.lat = lat ?? null;
    if (lng !== undefined) row.lng = lng ?? null;

    row.updated_at = new Date();
    await row.save();
    res.json(row);
  } catch (e) { next(e); }
}
