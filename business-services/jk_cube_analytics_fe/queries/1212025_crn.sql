select
	sum(billamount) as CRNAmount ,
	sum(crnbalanceamount) as CRNBalance ,
	count(1)
from
	"km.kolkata".comregisterednumber  c
inner join "km.kolkata".eg_department ed on
	ed.id = c.department
inner join "km.kolkata".eg_department ed2 on
	ed2.id = c.expensedepartment
where c.systemdate between '2024-08-02 00:00:00.000' and '2025-12-02 00:00:00.000';


select
	CASE 
		when fundtype= 1 then 'Government Fund'
		when fundtype= 0 then 'Revenue Fund'
		when fundtype = 3 then 'BEUP Fund'
	end as "Fund",
	ed.code || ' - ' || ed."name"  as  Source_Department,
	ed2.code || ' - ' || ed2."name"  as  Expense_Department ,
	sum(billamount) as CRNAmount ,
	sum(crnbalanceamount) as CRNBalance ,
	count(1)
from
	"km.kolkata".comregisterednumber  c
inner join "km.kolkata".eg_department ed on
	ed.id = c.department
inner join "km.kolkata".eg_department ed2 on
	ed2.id = c.expensedepartment
where c.systemdate between '2024-08-02 00:00:00.000' and '2025-12-02 00:00:00.000' and c.fundtype = 1 --0, 1, 3
group by
	fundtype ,
	ed.code ,ed.name,ed2.code,ed2.name;

select
	CASE 
		when fundtype= 1 then 'Government Fund'
		when fundtype= 0 then 'Revenue Fund'
		when fundtype = 3 then 'BEUP Fund'
	end as "Fund",
	ed.code || ' - ' || ed."name"  as  Source_Department,
	ed2.code || ' - ' || ed2."name"  as  Expense_Department ,
	sum(billamount) as CRNAmount ,
	sum(crnbalanceamount) as CRNBalance ,
	count(1)
from
	"km.kolkata".comregisterednumber  c
inner join "km.kolkata".eg_department ed on
	ed.id = c.department
inner join "km.kolkata".eg_department ed2 on
	ed2.id = c.expensedepartment
where c.systemdate between '2024-08-02 00:00:00.000' and '2025-12-02 00:00:00.000' 
and c.fundtype = 1 --0, 1, 3
and c.billamount = crnbalanceamount ---for unused CRNs
group by
	fundtype ,
	ed.code ,ed.name,ed2.code,ed2.name;



select
	CASE 
		when fundtype= 1 then 'Government Fund'
		when fundtype= 0 then 'Revenue Fund'
		when fundtype = 3 then 'BEUP Fund'
	end as "Fund",
	ed.code || ' - ' || ed."name"  as  Source_Department,
	ed2.code || ' - ' || ed2."name"  as  Expense_Department ,
	sum(billamount) as CRNAmount ,
	sum(crnbalanceamount) as CRNBalance ,
	count(1)
from
	"km.kolkata".comregisterednumber  c
inner join "km.kolkata".eg_department ed on
	ed.id = c.department
inner join "km.kolkata".eg_department ed2 on
	ed2.id = c.expensedepartment
where c.systemdate between '2024-08-02 00:00:00.000' and '2025-12-02 00:00:00.000'
group by
	fundtype ,
	ed.code ,ed.name,ed2.code,ed2.name;


