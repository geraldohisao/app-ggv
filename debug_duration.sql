SELECT COUNT(*) as total, COUNT(CASE WHEN duration > 180 THEN 1 END) as over_3min, AVG(duration) as avg_duration FROM calls;
