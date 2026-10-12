-- HTTP request headers contain private bridge credentials. Network queues are
-- internal transport, never browser-readable tables, even outside the Data API.
revoke all on net.http_request_queue,net._http_response from public,anon,authenticated;
grant select on net._http_response to service_role;
