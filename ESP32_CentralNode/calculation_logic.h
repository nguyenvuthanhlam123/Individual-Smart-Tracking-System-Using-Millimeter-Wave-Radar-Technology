#ifndef CALCULATION_LOGIC_H
#define CALCULATION_LOGIC_H

void initialize_logic();
void loop_logic();
void on_distance_received(int sensor_id, float distance);
void publish_results(const char* payload); // Declaration for external use

#endif // CALCULATION_LOGIC_H
