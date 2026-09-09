insert into business_rules (
    rule_key, title, description, min_advance_hours, same_day_cutoff,
    requires_evidence, coordinator_allowed, supervisor_allowed
) values
    ('schedule_change', 'Cambios de horario', 'Anticipación mínima configurada por WFM.', 48, null, true, true, true),
    ('swap', 'Enroques', 'Anticipación mínima configurada por WFM.', 48, null, false, true, true),
    ('comp_time', 'Compensados', 'Solo fechas futuras. El día en curso se recibe hasta la hora configurada.', 0, '15:00', false, true, false),
    ('overtime', 'Horas extra', 'Registrar el intervalo trabajado y adjuntar soporte si WFM lo solicita.', 0, null, false, true, true),
    ('siop_validation', 'Validación SIOP', 'Anticipación mínima y evidencia de conexión del asesor.', 48, null, true, false, true),
    ('exception', 'Excepciones', 'Revisión especial por WFM y Gerencia.', 0, null, true, true, true)
on conflict (rule_key) do nothing;
